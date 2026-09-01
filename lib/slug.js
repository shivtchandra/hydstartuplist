// URL slug for startup detail pages — derived from display name (unique across dataset).
export function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function startupSlug(startup) {
  return slugify(startup.name);
}
