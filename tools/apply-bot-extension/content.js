/**
 * AutoApply — Form Filler Content Script
 * Tailored for Shiva Chandra T
 * Bulletproof ATS autofill engine
 */

const DEFAULT_PROFILE = {
  firstName: "Shiva Chandra",
  lastName: "Takkelapati",
  fullName: "Shiva Chandra T",
  email: "shivachandra9490@gmail.com",
  phone: "9959041832",
  fullPhone: "+919959041832",
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  location: "Hyderabad, Telangana, India",
  linkedin: "https://www.linkedin.com/in/shiva-chandra-takkelapati-10ba3032b/",
  github: "https://github.com/shivtchandra",
  portfolio: "https://mapmyhyd.com",
  college: "Gandhi Institute of Technology and Management (GITAM)",
  degree: "B.E. Computer Science and Engineering",
  graduationYear: "2025",
  currentCompany: "Cognizant",
  currentTitle: "Full-Stack Engineer",
  noticePeriod: "Immediate / 15-30 days",
  experienceYears: "1.5",
  currentCtc: "8 LPA",
  expectedCtc: "12-15 LPA",
  summary: "Full-stack engineer building AI products end-to-end (Next.js/React, FastAPI/Node.js, Claude/Gemini LLM agent loops, RAG pipelines). Claude Certified Developer and AWS AI Practitioner."
};

let userProfile = {};

// Load user-overridden profile from chrome.storage if available
if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["userProfile"], (res) => {
    if (res.userProfile) userProfile = res.userProfile;
  });
}

function getEffectiveProfile() {
  const p = { ...DEFAULT_PROFILE, ...userProfile };
  if (!p.firstName || !p.lastName) {
    const parts = (p.fullName || "").trim().split(/\s+/);
    if (!p.firstName) p.firstName = parts[0] || "Shiva Chandra";
    if (!p.lastName) p.lastName = parts.slice(1).join(" ") || "Takkelapati";
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
  if (!el || value === undefined || value === null) return false;
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
    console.warn("AutoApply: error setting value for element", el, err);
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

  // 14. Summary / Cover Letter
  if (/\b(summary|cover[\s_-]*letter|tell[\s_-]*us[\s_-]*about[\s_-]*yourself|bio|about[\s_-]*you)\b/i.test(desc)) return "summary";

  return null;
}

/**
 * Main autofill procedure
 */
function runAutofill() {
  const p = getEffectiveProfile();
  let filledCount = 0;

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
      case "summary":
        if (!input.value) {
          if (setReactInputValue(input, p.summary)) filledCount++;
        }
        break;
    }
  }

  // 2. Radio Buttons & Checkboxes (Work Authorization, Sponsorship, Consent)
  const radios = Array.from(document.querySelectorAll("input[type='radio'], input[type='checkbox']"));
  for (const r of radios) {
    if (r.disabled) continue;
    const parentContainer =
      r.closest("fieldset, div[class*='group'], div[class*='question'], div[class*='field'], label") ||
      r.parentElement;
    const text = (parentContainer ? parentContainer.textContent : "").toLowerCase();
    const valText = (r.value + " " + (r.nextSibling?.textContent || "")).toLowerCase();

    // Legally authorized to work? -> Yes
    if (/authorized to work|eligible to work|legal right to work/i.test(text)) {
      if (/yes/i.test(valText) || r.value === "true" || r.value === "1") {
        if (checkRadioOrCheckbox(r, true)) filledCount++;
      }
    }

    // Require visa sponsorship? -> No
    if (/require sponsorship|visa sponsorship|need sponsorship/i.test(text)) {
      if (/no/i.test(valText) || r.value === "false" || r.value === "0") {
        if (checkRadioOrCheckbox(r, true)) filledCount++;
      }
    }

    // Privacy policy / consent agreement checkboxes
    if (/agree to|consent|privacy policy|terms/i.test(text) && r.type === "checkbox") {
      if (checkRadioOrCheckbox(r, true)) filledCount++;
    }
  }

  // 3. Dropdowns (<select>)
  const selects = Array.from(document.querySelectorAll("select"));
  for (const sel of selects) {
    if (sel.disabled) continue;
    const desc = getFieldDescriptor(sel);
    for (const opt of Array.from(sel.options)) {
      const optText = opt.text.toLowerCase();
      // Authorized to work -> Yes
      if (/authorized|eligible/i.test(desc) && /^yes\b/i.test(optText)) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        sel.classList.add("autoapply-field-highlight");
        filledCount++;
        break;
      }
      // Sponsorship -> No
      if (/sponsorship/i.test(desc) && /^no\b/i.test(optText)) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        sel.classList.add("autoapply-field-highlight");
        filledCount++;
        break;
      }
      // Country -> India
      if (/country/i.test(desc) && /^india\b/i.test(optText)) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        sel.classList.add("autoapply-field-highlight");
        filledCount++;
        break;
      }
      // Gender -> Male / Prefer not to say
      if (/gender/i.test(desc) && (optText.includes("male") || optText.includes("decline") || optText.includes("prefer not"))) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        sel.classList.add("autoapply-field-highlight");
        filledCount++;
        break;
      }
    }
  }

  // 4. Highlight resume file upload input if present
  let resumeBoxFound = false;
  const fileInputs = Array.from(document.querySelectorAll("input[type='file']"));
  for (const fi of fileInputs) {
    const desc = getFieldDescriptor(fi);
    if (/resume|cv|curriculum/i.test(desc) || fileInputs.length === 1) {
      const parent = fi.closest("label, div[class*='upload'], div[class*='drop'], div[class*='file'], form") || fi.parentElement;
      if (parent) {
        parent.style.outline = "2px dashed #f59e0b";
        parent.style.backgroundColor = "rgba(245, 158, 11, 0.08)";
        parent.setAttribute("title", "AutoApply: Upload Shiva T Resume.pdf here");
      }
      resumeBoxFound = true;
    }
  }

  const msg = resumeBoxFound
    ? `✨ AutoApply: Filled ${filledCount} fields! 📄 Resume box highlighted (drag & drop Shiva T Resume.pdf)`
    : `✨ AutoApply: Filled ${filledCount} fields!`;
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
    <span>⚡ Autofill Shiva (Alt+A)</span>
  `;

  pill.addEventListener("click", () => {
    runAutofill();
  });

  document.body.appendChild(pill);
}

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
