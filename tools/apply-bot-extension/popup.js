/**
 * AutoApply — Popup Script
 */

const fields = [
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "linkedin",
  "github",
  "portfolio",
  "location",
  "noticePeriod",
  "currentCompany",
  "currentTitle",
  "experienceYears",
  "expectedCtc"
];

// Load saved profile on popup open
document.addEventListener("DOMContentLoaded", () => {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["userProfile"], (res) => {
      if (res.userProfile) {
        for (const key of fields) {
          if (res.userProfile[key] !== undefined && document.getElementById(key)) {
            document.getElementById(key).value = res.userProfile[key];
          }
        }
      }
    });
  }

  // Auto-sync Full Name when First or Last Name changes
  const fnInput = document.getElementById("firstName");
  const lnInput = document.getElementById("lastName");
  const fullInput = document.getElementById("fullName");

  function updateFullNameFromParts() {
    const fn = fnInput.value.trim();
    const ln = lnInput.value.trim();
    if (fn || ln) {
      fullInput.value = `${fn} ${ln}`.trim();
    }
  }

  fnInput?.addEventListener("blur", updateFullNameFromParts);
  lnInput?.addEventListener("blur", updateFullNameFromParts);

  // Fill button
  document.getElementById("btn-fill")?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "autofill" }).catch(() => {
          alert("Please refresh the job page once so AutoApply can attach to it!");
        });
        window.close();
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Save profile
  document.getElementById("btn-save")?.addEventListener("click", () => {
    const profile = {};
    for (const key of fields) {
      const el = document.getElementById(key);
      if (el) profile[key] = el.value.trim();
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ userProfile: profile }, () => {
        const status = document.getElementById("save-status");
        if (status) {
          status.style.display = "block";
          setTimeout(() => {
            status.style.display = "none";
          }, 2000);
        }
      });
    }
  });
});
