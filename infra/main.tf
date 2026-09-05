terraform {
  required_providers { google = { source = "hashicorp/google", version = "~> 6.0" } }
}
variable "project_id" { type = string }
variable "region" { type = string
  default = "asia-south1"
}
variable "worker_image" { type = string }
variable "ingestion_enabled" { type = bool
  default = false
}
provider "google" { project = var.project_id
  region = var.region
}
resource "google_project_service" "apis" {
  for_each = toset(["run.googleapis.com", "cloudtasks.googleapis.com", "cloudscheduler.googleapis.com", "firestore.googleapis.com"])
  service = each.key
  disable_on_destroy = false
}
resource "google_service_account" "worker" { account_id = "hyd-jobs-worker" }
resource "google_project_iam_member" "worker_roles" {
  for_each = toset(["roles/datastore.user", "roles/cloudtasks.enqueuer"])
  project = var.project_id
  role = each.key
  member = "serviceAccount:${google_service_account.worker.email}"
}
resource "google_service_account_iam_member" "act_as" {
  service_account_id = google_service_account.worker.name
  role = "roles/iam.serviceAccountUser"
  member = "serviceAccount:${google_service_account.worker.email}"
}
resource "google_cloud_tasks_queue" "jobs" {
  name = "hyd-job-scans"
  location = var.region
  rate_limits { max_concurrent_dispatches = 2
    max_dispatches_per_second = 1
  }
  retry_config { max_attempts = 3
    min_backoff = "60s"
    max_backoff = "3600s"
  }
  depends_on = [google_project_service.apis]
}
resource "google_cloud_run_v2_service" "worker" {
  name = "hyd-jobs-worker"
  location = var.region
  deletion_protection = true
  template {
    service_account = google_service_account.worker.email
    timeout = "240s"
    max_instance_request_concurrency = 1
    scaling { min_instance_count = 0
      max_instance_count = 2
    }
    containers {
      image = var.worker_image
      resources { limits = { cpu = "1", memory = "512Mi" }
        cpu_idle = true
      }
      dynamic "env" {
        for_each = {
          GOOGLE_CLOUD_PROJECT = var.project_id, GCP_REGION = var.region,
          TASK_QUEUE = google_cloud_tasks_queue.jobs.name,
          TASK_SERVICE_ACCOUNT = google_service_account.worker.email,
          INGESTION_ENABLED = tostring(var.ingestion_enabled ? 1 : 0),
          DAILY_SCAN_LIMIT = "2400", DAILY_BACKGROUND_INR = "60", SCAN_ESTIMATED_INR = "0.05"
        }
        content { name = env.key
          value = env.value
        }
      }
      env { name = "WORKER_URL"
        value = "https://hyd-jobs-worker-${data.google_project.current.number}.${var.region}.run.app"
      }
    }
  }
  depends_on = [google_project_service.apis]
}
data "google_project" "current" { project_id = var.project_id }
resource "google_cloud_run_v2_service_iam_member" "invoker" {
  location = var.region
  name = google_cloud_run_v2_service.worker.name
  role = "roles/run.invoker"
  member = "serviceAccount:${google_service_account.worker.email}"
}
resource "google_cloud_scheduler_job" "dispatch" {
  name = "hyd-jobs-dispatch"
  schedule = "*/5 * * * *"
  time_zone = "Asia/Kolkata"
  paused = !var.ingestion_enabled
  http_target {
    uri = "${google_cloud_run_v2_service.worker.uri}/dispatch"
    http_method = "POST"
    oidc_token { service_account_email = google_service_account.worker.email
      audience = google_cloud_run_v2_service.worker.uri
    }
  }
}
resource "google_firestore_field" "session_ttl" {
  collection = "engagement_sessions"
  field = "expiresAt"
  ttl_config {}
}
output "worker_url" { value = google_cloud_run_v2_service.worker.uri }
