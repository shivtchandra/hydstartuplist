/**
 * Mapping HYD Apply Copilot — review-first ATS form assistant.
 * Candidate facts arrive from the local extension profile or a Mapping HYD application pack.
 */

const DEFAULT_PROFILE = {
  firstName: "",
  lastName: "",
  fullName: "",
  email: "",
  phone: "",
  fullPhone: "",
  city: "",
  state: "",
  country: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  college: "",
  degree: "",
  graduationYear: "",
  currentCompany: "",
  currentTitle: "",
  noticePeriod: "",
  experienceYears: "",
  currentCtc: "",
  expectedCtc: "",
  summary: ""
};

let userProfile = {};
let activeApplicationPack = null;

// Load user-overridden profile from chrome.storage if available
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["userProfile", "activeApplicationPack"], (res) => {
    if (res.userProfile) userProfile = res.userProfile;
    if (res.activeApplicationPack) activeApplicationPack = res.activeApplicationPack;
  });
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.userProfile?.newValue) userProfile = changes.userProfile.newValue;
    if (changes.activeApplicationPack?.newValue) activeApplicationPack = changes.activeApplicationPack.newValue;
  });
}

function getEffectiveProfile() {
  const p = { ...DEFAULT_PROFILE, ...userProfile };
  if (!p.firstName || !p.lastName) {
    const parts = (p.fullName || "").trim().split(/\s+/);
    if (!p.firstName) p.firstName = parts[0] || "";
    if (!p.lastName) p.lastName = parts.slice(1).join(" ") || "";
  }
  if (!p.fullName) {
    p.fullName = `${p.firstName || ""} ${p.lastName || ""}`.trim();
  }
  return p;
}

/**
 * Set value in a way that triggers React / Vue / Angular / Solid state listeners
 */
function setReactInputValue(el, value) {
  if (!el || value === undefined || value === null || String(value).trim() === "") return false;
  try {
    el.focus();

    const proto = Object.getPrototypeOf(el);
    const descriptor =
      Object.getOwnPropertyDescriptor(proto, "value") ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value") ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");

    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }

    // Reset React 16+ internal valueTracker so it registers the change
    if (el._valueTracker) {
      el._valueTracker.setValue("");
    }

    // Dispatch standard input and change events
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));

    el.classList.add("autoapply-field-highlight");
    return true;
  } catch (err) {
    console.warn("Apply Copilot: error setting value for element", el, err);
    return false;
  }
}

function checkRadioOrCheckbox(el, state = true) {
  if (!el || el.checked === state) return false;
  try {
    el.focus();
    el.checked = state;
    el.dispatchEvent(new Event("click", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));

    const parent = el.closest("label") || el.parentElement;
    if (parent) parent.classList.add("autoapply-field-highlight");
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Extract comprehensive identifier tokens from an element and surrounding DOM
 */
function getFieldDescriptor(el) {
  const parts = [];

  if (el.id) parts.push(el.id);
  if (el.name) parts.push(el.name);
  if (el.placeholder) parts.push(el.placeholder);
  if (el.title) parts.push(el.title);

  const autocomplete = el.autocomplete || el.getAttribute("autocomplete");
  if (autocomplete) parts.push(autocomplete);

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) parts.push(ariaLabel);

  const ariaDescription = el.getAttribute("aria-description");
  if (ariaDescription) parts.push(ariaDescription);

  const ariaLabelledby = el.getAttribute("aria-labelledby");
  if (ariaLabelledby) {
    ariaLabelledby.split(/\s+/).forEach((id) => {
      try {
        const lbl = document.getElementById(id);
        if (lbl && lbl.textContent) parts.push(lbl.textContent.trim());
      } catch (e) {}
    });
  }

  // ATS and testing attributes
  for (const attr of [
    "data-automation-id",
    "data-testid",
    "data-test",
    "data-field-name",
    "data-qa",
    "data-cy"
  ]) {
    const val = el.getAttribute(attr);
    if (val) parts.push(val);
  }

  // HTML5 el.labels NodeList
  if (el.labels && el.labels.length) {
    for (const l of el.labels) {
      if (l.textContent) parts.push(l.textContent.trim());
    }
  }

  // label[for=id]
  if (el.id) {
    try {
      const escaped = CSS.escape ? CSS.escape(el.id) : el.id;
      const label = document.querySelector(`label[for="${escaped}"]`);
      if (label && label.textContent) parts.push(label.textContent.trim());
    } catch (e) {}
  }

  // Closest parent <label>
  const parentLabel = el.closest("label");
  if (parentLabel && parentLabel.textContent) {
    parts.push(parentLabel.textContent.trim());
  }

  // Immediate preceding sibling if it's text/label
  if (el.previousElementSibling) {
    const prevText = (el.previousElementSibling.textContent || "").trim();
    if (prevText && prevText.length < 80) parts.push(prevText);
  }

  // Walk up to 3 parents looking for an isolated label or heading
  let parent = el.parentElement;
  let depth = 0;
  while (parent && depth < 3 && parent !== document.body) {
    // Only inherit heading if container does not contain multiple inputs
    const inputsInParent = parent.querySelectorAll("input:not([type='hidden']), textarea, select");
    if (inputsInParent.length <= 1) {
      const heading = parent.querySelector("label, [role='label'], span.label, .label, p, h4, h5");
      if (heading && heading !== el && !heading.contains(el)) {
        const txt = (heading.textContent || "").trim();
        if (txt && txt.length < 80) {
          parts.push(txt);
          break;
        }
      }
    }
    parent = parent.parentElement;
    depth++;
  }

  return parts.join(" ").toLowerCase();
}

/**
 * Classify element into semantic profile field
 */
function classifyField(el, desc) {
  const inputType = (el.type || "text").toLowerCase();
  const auto = (el.autocomplete || el.getAttribute("autocomplete") || "").toLowerCase();

  // 1. Direct input type checks
  if (inputType === "email") return "email";
  if (inputType === "tel") return "phone";
  if (inputType === "url") {
    if (/linkedin/i.test(desc)) return "linkedin";
    if (/github/i.test(desc)) return "github";
    return "portfolio";
  }

  // 2. Standard autocomplete attributes (W3C HTML5 spec)
  if (auto === "given-name" || auto === "fname") return "firstName";
  if (auto === "family-name" || auto === "lname") return "lastName";
  if (auto === "name") return "fullName";
  if (auto === "email") return "email";
  if (auto === "tel" || auto === "tel-national" || auto === "tel-local") return "phone";
  if (auto === "address-level2") return "city";
  if (auto === "address-level1") return "state";
  if (auto === "country-name" || auto === "country") return "country";
  if (auto === "organization") return "currentCompany";
  if (auto === "organization-title") return "currentTitle";

  // Check for company/school/account/role names to prevent false positive candidate name matches
  const hasNameExclusions = /\b(company|employer|organization|workplace|user|file|project|domain|school|college|university|middle|street|account|role|job|group)[\s_-]*name/i.test(desc);

  // 3. First Name / Given Name
  if (!hasNameExclusions && (/\b(first[\s_-]*name|given[\s_-]*name|fname|forename|legal[\s_-]*first[\s_-]*name)\b|firstname|givenname/i.test(desc))) {
    if (!/\blast|family|surname|middle\b/i.test(desc)) return "firstName";
  }

  // 4. Last Name / Family Name / Surname
  if (!hasNameExclusions && (/\b(last[\s_-]*name|family[\s_-]*name|surname|lname|legal[\s_-]*last[\s_-]*name)\b|lastname|familyname|surname/i.test(desc))) {
    if (!/\bfirst|given\b/i.test(desc)) return "lastName";
  }

  // 5. Full Name / Candidate Name / Applicant Name
  if (!hasNameExclusions && (/\b(full[\s_-]*name|candidate[\s_-]*name|applicant[\s_-]*name|your[\s_-]*name|legal[\s_-]*name)\b|fullname/i.test(desc))) {
    return "fullName";
  }

  // 6. Standalone Name (e.g. name="name", placeholder="Name", label="Name *")
  if (!hasNameExclusions && /\bname\b/i.test(desc)) {
    if (!/first|last|middle|sur|family|given|company|user|school|college|file|account/i.test(desc)) {
      return "fullName";
    }
  }

  // 7. Email
  if (/\b(e[-_]?mail|emailaddress)\b/i.test(desc)) return "email";

  // 8. Phone / Mobile
  if (/\b(phone|mobile|cell|contact[\s_-]*number|telephone)\b/i.test(desc)) return "phone";

  // 9. Social Links
  if (/\blinkedin\b/i.test(desc)) return "linkedin";
  if (/\bgithub\b/i.test(desc)) return "github";
  if (/\b(portfolio|personal[\s_-]*site|personal[\s_-]*website|website|blog|personal[\s_-]*url)\b/i.test(desc)) return "portfolio";

  // 10. Location (City, State, Country, Full Location)
  if (/\bcity\b/i.test(desc)) return "city";
  if (/\b(state|province|region)\b/i.test(desc)) return "state";
  if (/\bcountry\b/i.test(desc)) return "country";
  if (/\b(current[\s_-]*location|present[\s_-]*location|current[\s_-]*address|location)\b/i.test(desc)) return "location";

  // 11. Work details
  if (/\bnotice[\s_-]*period\b|\bnotice[\s_-]*time\b/i.test(desc)) return "noticePeriod";
  if (/\b(current|present)[\s_-]*(company|employer|organization|workplace)\b/i.test(desc)) return "currentCompany";
  if (/\b(current|present)[\s_-]*(job[\s_-]*)?(title|role|position|designation)\b/i.test(desc)) return "currentTitle";
  if (/\b(years[\s_-]*of[\s_-]*experience|total[\s_-]*experience|yoe)\b/i.test(desc)) return "experienceYears";

  // 12. Education
  if (/\b(college|university|school|institution|alma[\s_-]*mater)\b/i.test(desc)) return "college";
  if (/\b(degree|qualification|major|field[\s_-]*of[\s_-]*study)\b/i.test(desc)) return "degree";
  if (/\b(graduation[\s_-]*(year|date)|grad[\s_-]*year|year[\s_-]*of[\s_-]*passing|yop)\b/i.test(desc)) return "graduationYear";

  // 13. Compensation (India / Startup ATS)
  if (/\b(current[\s_-]*(ctc|salary|compensation|package))\b/i.test(desc)) return "currentCtc";
  if (/\b(expected[\s_-]*(ctc|salary|compensation|package))\b/i.test(desc)) return "expectedCtc";

  // 14. Role-specific written answers supplied by the reviewed application pack.
  if (/\b(why[\s_-]*(this|the)?[\s_-]*(company|role|position)|why[\s_-]*do[\s_-]*you[\s_-]*want|what[\s_-]*interests[\s_-]*you)\b/i.test(desc)) return "whyRole";
  if (/\b(most[\s_-]*relevant[\s_-]*experience|describe[\s_-]*your[\s_-]*experience|relevant[\s_-]*background)\b/i.test(desc)) return "relevantExperience";
  if (/\b(summary|cover[\s_-]*letter|tell[\s_-]*us[\s_-]*about[\s_-]*yourself|bio|about[\s_-]*you)\b/i.test(desc)) return "summary";

  return null;
}

function getPackAnswer(id) {
  return activeApplicationPack?.answers?.find((answer) => answer.id === id)?.answer || "";
}

/**
 * Main autofill procedure
 */
function runAutofill() {
  const p = getEffectiveProfile();
  let filledCount = 0;
  let reviewCount = 0;

  // 1. Text Inputs and Textareas
  const inputs = Array.from(
    document.querySelectorAll(
      "input:not([type='hidden']):not([type='file']):not([type='submit']):not([type='button']), textarea"
    )
  );

  for (const input of inputs) {
    if (input.type === "radio" || input.type === "checkbox") continue;
    if (input.disabled || input.readOnly) continue;

    const desc = getFieldDescriptor(input);
    const fieldType = classifyField(input, desc);

    if (!fieldType) continue;

    switch (fieldType) {
      case "firstName":
        if (setReactInputValue(input, p.firstName)) filledCount++;
        break;
      case "lastName":
        if (setReactInputValue(input, p.lastName)) filledCount++;
        break;
      case "fullName":
        if (setReactInputValue(input, p.fullName)) filledCount++;
        break;
      case "email":
        if (setReactInputValue(input, p.email)) filledCount++;
        break;
      case "phone": {
        const val = /^\+/.test(input.value) || /\+/.test(input.placeholder || "") ? p.fullPhone : p.phone;
        if (setReactInputValue(input, val)) filledCount++;
        break;
      }
      case "linkedin":
        if (setReactInputValue(input, p.linkedin)) filledCount++;
        break;
      case "github":
        if (setReactInputValue(input, p.github)) filledCount++;
        break;
      case "portfolio":
        if (setReactInputValue(input, p.portfolio)) filledCount++;
        break;
      case "city":
        if (setReactInputValue(input, p.city)) filledCount++;
        break;
      case "state":
        if (setReactInputValue(input, p.state)) filledCount++;
        break;
      case "country":
        if (setReactInputValue(input, p.country)) filledCount++;
        break;
      case "location":
        if (setReactInputValue(input, p.location)) filledCount++;
        break;
      case "noticePeriod":
        if (setReactInputValue(input, p.noticePeriod)) filledCount++;
        break;
      case "currentCompany":
        if (setReactInputValue(input, p.currentCompany)) filledCount++;
        break;
      case "currentTitle":
        if (setReactInputValue(input, p.currentTitle)) filledCount++;
        break;
      case "experienceYears":
        if (setReactInputValue(input, p.experienceYears)) filledCount++;
        break;
      case "college":
        if (setReactInputValue(input, p.college)) filledCount++;
        break;
      case "degree":
        if (setReactInputValue(input, p.degree)) filledCount++;
        break;
      case "graduationYear":
        if (setReactInputValue(input, p.graduationYear)) filledCount++;
        break;
      case "currentCtc":
        if (setReactInputValue(input, p.currentCtc)) filledCount++;
        break;
      case "expectedCtc":
        if (setReactInputValue(input, p.expectedCtc)) filledCount++;
        break;
      case "whyRole": {
        const answer = getPackAnswer("why-role");
        if (answer && !input.value && setReactInputValue(input, answer)) filledCount++;
        break;
      }
      case "relevantExperience": {
        const answer = getPackAnswer("relevant-experience");
        if (answer && !input.value && setReactInputValue(input, answer)) filledCount++;
        break;
      }
      case "summary": {
        const answer = getPackAnswer("about-you") || p.summary;
        if (answer && !input.value && setReactInputValue(input, answer)) filledCount++;
        break;
      }
    }
  }

  // 2. Sensitive, legal, consent, and demographic questions always require human review.
  const reviewGroups = new Set();
  const radios = Array.from(document.querySelectorAll("input[type='radio'], input[type='checkbox']"));
  for (const input of radios) {
    if (input.disabled) continue;
    const container = input.closest("fieldset, div[class*='group'], div[class*='question'], div[class*='field'], label") || input.parentElement;
    const text = (container ? container.textContent : "").toLowerCase();
    if (/authorized to work|eligible to work|legal right to work|sponsorship|visa|gender|sex|race|ethnic|disability|veteran|consent|privacy policy|terms/i.test(text)) {
      const target = container || input;
      target.classList.add("autoapply-review-required");
      target.setAttribute("title", "Apply Copilot: review this answer yourself");
      if (!reviewGroups.has(target)) {
        reviewGroups.add(target);
        reviewCount++;
      }
    }
  }

  // 3. Fill only a verified country value; highlight every sensitive dropdown for review.
  const selects = Array.from(document.querySelectorAll("select"));
  for (const select of selects) {
    if (select.disabled) continue;
    const desc = getFieldDescriptor(select);
    if (/authorized|eligible|sponsorship|visa|gender|sex|race|ethnic|disability|veteran|consent/i.test(desc)) {
      select.classList.add("autoapply-review-required");
      select.setAttribute("title", "Apply Copilot: review this answer yourself");
      reviewCount++;
      continue;
    }
    if (/country/i.test(desc) && p.country) {
      const option = Array.from(select.options).find((item) => item.text.trim().toLowerCase() === p.country.trim().toLowerCase());
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        select.classList.add("autoapply-field-highlight");
        filledCount++;
      }
    }
  }

  // 4. Highlight resume file upload input if present
  let resumeBoxFound = false;
  const resumeFileName = activeApplicationPack?.fileName || "your tailored resume";
  const fileInputs = Array.from(document.querySelectorAll("input[type='file']"));
  for (const fi of fileInputs) {
    const desc = getFieldDescriptor(fi);
    if (/resume|cv|curriculum/i.test(desc) || fileInputs.length === 1) {
      const parent = fi.closest("label, div[class*='upload'], div[class*='drop'], div[class*='file'], form") || fi.parentElement;
      if (parent) {
        parent.style.outline = "2px dashed #f59e0b";
        parent.style.backgroundColor = "rgba(245, 158, 11, 0.08)";
        parent.setAttribute("title", `Apply Copilot: upload ${resumeFileName} here`);
      }
      resumeBoxFound = true;
    }
  }

  const reviewNote = reviewCount ? ` ${reviewCount} sensitive question${reviewCount === 1 ? "" : "s"} left for your review.` : "";
  const msg = resumeBoxFound
    ? `Apply Copilot filled ${filledCount} fields. Upload ${resumeFileName} in the highlighted box.${reviewNote}`
    : `Apply Copilot filled ${filledCount} fields.${reviewNote}`;
  showToast(msg);
}

/**
 * Toast Notification
 */
function showToast(msg) {
  let toast = document.getElementById("autoapply-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "autoapply-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 4000);
}

/**
 * Inject Floating Action Pill on job application forms
 */
function initFloatingPill() {
  if (document.getElementById("autoapply-floating-pill")) return;

  const isJobPage =
    /apply|job|career|posting|greenhouse|lever\.co|ashbyhq|bamboohr|myworkdayjobs|smartrecruiters|zohorecruit|darwinbox|weekday/i.test(window.location.href) ||
    document.querySelector("input[name*='name'], input[id*='name'], input[placeholder*='name'], input[type='file'], form");

  if (!isJobPage) return;

  const pill = document.createElement("div");
  pill.id = "autoapply-floating-pill";
  pill.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
    <span>Apply Copilot · Review & fill (Alt+A)</span>
  `;

  pill.addEventListener("click", () => {
    runAutofill();
  });

  document.body.appendChild(pill);
}

// Receive a reviewed Candidate Passport and application pack from Mapping HYD.
window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.type !== "MAPMYHYD_APPLICATION_PACK") return;
  const trustedOrigin = /^https:\/\/(?:startups\.)?mapmyhyd\.com$/i.test(event.origin) || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(event.origin);
  if (!trustedOrigin) return;

  const payload = event.data.payload;
  if (!payload?.profile || !payload?.activeApplicationPack) return;
  userProfile = payload.profile;
  activeApplicationPack = payload.activeApplicationPack;
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.set({ userProfile, activeApplicationPack });
  }
  showToast(`Application pack ready for ${activeApplicationPack.job?.company || "this employer"}. Review every field before submitting.`);
});

// Listen for Alt+A shortcut
window.addEventListener("keydown", (e) => {
  if (e.altKey && (e.key === "a" || e.key === "A" || e.code === "KeyA")) {
    e.preventDefault();
    runAutofill();
  }
});

// Listen for background service worker command
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "autofill") runAutofill();
  });
}

// Observe DOM additions (e.g. modals opening on SPA sites)
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    initFloatingPill();
  }, 500);
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFloatingPill);
} else {
  initFloatingPill();
}
