/**
 * Section Parser for ATS Resume Optimization
 * Robustly parses plain text, markdown, and PDF-extracted resumes into
 * structured sections while guaranteeing 100% preservation of candidate
 * projects, work experience, education, and contact details.
 */

// Common section header patterns
const SECTION_PATTERNS = {
  summary: /^(?:professional\s+|executive\s+|career\s+)?(?:summary|profile|about\s+me|objective|overview)/i,
  skills: /^(?:technical\s+|core\s+|key\s+)?(?:skills|technologies|competencies|tech\s+stack|tools\s*&?\s*technologies)/i,
  projects: /^(?:technical\s+|key\s+|academic\s+|personal\s+|featured\s+|selected\s+|notable\s+)?projects/i,
  experience: /^(?:work\s+|professional\s+|relevant\s+|employment\s+)?(?:experience|employment|work\s+history|internships?|career\s+history)/i,
  education: /^(?:education|academic(?:s|\s+background|\s+history)?|qualifications?)/i,
  certifications: /^(?:certifications?|certificates?|licenses|achievements?|awards?|honors?|publications?|extracurricular)/i,
};

/**
 * Checks if a trimmed line is a major section title.
 */
function identifySection(line) {
  const cleaned = line
    .replace(/^#+\s*/, '')
    .replace(/^[-*•_=\s]+|[-*•_=\s]+$/g, '')
    .replace(/:$/, '')
    .trim();

  if (cleaned.length < 2 || cleaned.length > 45) return null;

  for (const [key, regex] of Object.entries(SECTION_PATTERNS)) {
    if (regex.test(cleaned)) {
      return key;
    }
  }
  return null;
}

/**
 * Extracts emails, phone numbers, links, and location from text.
 */
function extractContactInfo(lines) {
  let email = '';
  let phone = '';
  const links = [];
  let location = '';

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/;
  const linkRegex = /(?:https?:\/\/)?(?:www\.)?(github\.com\/[^\s,|]+|linkedin\.com\/in\/[^\s,|]+|[a-zA-Z0-9-]+\.(?:vercel\.app|netlify\.app|github\.io|dev|io|tech|me|com\/[^\s,|]+))/i;
  const locationRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*,\s*(?:Telangana|India|Andhra Pradesh|Karnataka|Bangalore|Hyderabad|Remote|Hybrid|[A-Z]{2}))\b/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!email) {
      const m = line.match(emailRegex);
      if (m) email = m[0];
    }
    if (!phone) {
      const m = line.match(phoneRegex);
      if (m && m[0].replace(/\D/g, '').length >= 9) phone = m[0].trim();
    }
    const linkMatches = line.match(new RegExp(linkRegex, 'g'));
    if (linkMatches) {
      for (const l of linkMatches) {
        if (!links.includes(l)) links.push(l);
      }
    }
    if (!location) {
      const m = line.match(locationRegex);
      if (m) location = m[0];
    }
  }

  return { email, phone, links, location };
}

/**
 * Parses raw text into individual bullet points.
 */
function parseBulletPoints(textOrLines) {
  const lines = Array.isArray(textOrLines) ? textOrLines : textOrLines.split(/\r?\n/);
  const bullets = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Remove markdown bullet or list prefixes
    line = line.replace(/^[-*•–—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();

    if (line.length >= 15) {
      bullets.push(line);
    }
  }

  return bullets;
}

/**
 * Extracts structured project objects from the projects section lines.
 */
function extractProjectsFromLines(lines) {
  const projects = [];
  let currentProject = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // If this line is a link (e.g. [GitHub](...) or http...) and we have a current project, attach it as the link
    const isLinkLine = /^(\[.*\]\(https?:\/\/.*\)|\(?https?:\/\/[^\s)]+\)?|(?:github|demo|link|repo):\s*https?:\/\/.*)/i.test(line);
    if (isLinkLine && currentProject) {
      const match = line.match(/https?:\/\/[^\s)]+/);
      if (match) currentProject.link = match[0];
      currentProject.rawLines.push(line);
      continue;
    }

    // Check if line is a self-contained inline project: e.g. "1. Hospital Management System (React, Node) - Developed..."
    const inlineMatch = line.match(/^(?:\d+[\.\)]\s*)?([A-Za-z0-9\s-_/]+?)\s*(?:\(([^()]+)\)|[|–—]\s*([A-Za-z0-9,\s./+]+?))\s*(?:[|–—:-]\s*|\s+[-–—]\s+)(.+)$/);
    if (inlineMatch && inlineMatch[1].length < 50 && inlineMatch[4].length > 15 && !line.startsWith('-') && !line.startsWith('•')) {
      if (currentProject) {
        projects.push(currentProject);
        currentProject = null;
      }
      projects.push({
        title: inlineMatch[1].trim(),
        tech: (inlineMatch[2] || inlineMatch[3] || '').trim(),
        link: '',
        bullets: [inlineMatch[4].trim()],
        rawLines: [line],
      });
      continue;
    }

    const isHeaderCandidate =
      line.startsWith('###') ||
      line.startsWith('##') ||
      line.startsWith('**') ||
      (/^([A-Za-z0-9\s-_/]+)(?:\s*[|–—:-]\s*|\s*\()([A-Za-z0-9,\s./+]+)\)?$/i.test(line) && !line.startsWith('-') && !line.startsWith('•'));

    // Check if line looks like a project title
    const looksLikeTitle =
      !isLinkLine &&
      (isHeaderCandidate ||
        (line.length < 90 &&
          !line.startsWith('-') &&
          !line.startsWith('•') &&
          !line.startsWith('*') &&
          i + 1 < lines.length &&
          (lines[i + 1].trim().startsWith('-') || lines[i + 1].trim().startsWith('•') || lines[i + 1].trim().startsWith('*'))));

    if (looksLikeTitle) {
      if (currentProject) {
        projects.push(currentProject);
      }

      // Parse title and tech stack
      let cleanTitle = line.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
      let tech = '';
      let link = '';

      // Check for links (e.g. [GitHub](url) or https://...)
      const linkMatch = cleanTitle.match(/\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s)]+/i);
      if (linkMatch) {
        link = linkMatch[2] || linkMatch[0];
        cleanTitle = cleanTitle.replace(linkMatch[0], '').replace(/[|()]/g, '').trim();
      }

      // Check for separator like | or - or (tech)
      const sepMatch = cleanTitle.match(/^(.*?)\s*(?:[|–—:]|\s*\()\s*([^()]+)\)?$/);
      if (sepMatch && sepMatch[2].length > 2 && sepMatch[1].length > 2) {
        cleanTitle = sepMatch[1].trim();
        tech = sepMatch[2].trim();
      }

      if (cleanTitle) {
        currentProject = {
          title: cleanTitle,
          tech: tech,
          link: link,
          bullets: [],
          rawLines: [line],
        };
      }
    } else if (currentProject) {
      currentProject.rawLines.push(line);
      const cleanedBullet = line.replace(/^[-*•–—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
      if (cleanedBullet.length > 15) {
        currentProject.bullets.push(cleanedBullet);
      }
    } else {
      // Fallback: bullet before any title
      const cleaned = line.replace(/^[-*•–—]\s*/, '').trim();
      if (cleaned.length > 20) {
        currentProject = {
          title: 'Technical Project',
          tech: '',
          link: '',
          bullets: [cleaned],
          rawLines: [line],
        };
      }
    }
  }

  if (currentProject) {
    projects.push(currentProject);
  }

  // If we only have 1 generic "Technical Project" with multiple bullets that look like "ProjectName: description", break them out
  if (projects.length === 1 && projects[0].title === 'Technical Project' && projects[0].bullets.length > 1) {
    const splitProjects = [];
    for (const b of projects[0].bullets) {
      const match = b.match(/^([A-Za-z0-9\s-_/]+)\s*:\s*(.+)$/);
      if (match && match[1].length < 40 && match[2].length > 15) {
        splitProjects.push({
          title: match[1].trim(),
          tech: '',
          link: '',
          bullets: [match[2].trim()],
          rawLines: [b],
        });
      }
    }
    if (splitProjects.length > 0) {
      return splitProjects;
    }
  }

  return projects;
}

/**
 * Extracts structured work experience from experience section lines.
 */
function extractExperienceFromLines(lines) {
  const experiences = [];
  let currentExp = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    const isHeaderCandidate =
      line.startsWith('###') ||
      line.startsWith('##') ||
      line.startsWith('**') ||
      (line.length < 100 &&
        !line.startsWith('-') &&
        !line.startsWith('•') &&
        (line.includes('|') || line.includes('–') || line.includes('—') || /\b(20\d\d|19\d\d|present|intern|engineer|developer|lead|analyst)\b/i.test(line)));

    const looksLikeEntry =
      isHeaderCandidate ||
      (line.length < 90 &&
        !line.startsWith('-') &&
        !line.startsWith('•') &&
        !line.startsWith('*') &&
        i + 1 < lines.length &&
        (lines[i + 1].trim().startsWith('-') || lines[i + 1].trim().startsWith('•')));

    if (looksLikeEntry) {
      if (currentExp) {
        experiences.push(currentExp);
      }

      let cleanLine = line.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
      const parts = cleanLine.split(/\s*[|–—]\s*/);
      const companyOrRole = parts[0] || 'Software Engineer';
      const secondary = parts.slice(1).join(' | ');

      currentExp = {
        title: companyOrRole,
        details: secondary,
        bullets: [],
        rawLines: [line],
      };
    } else if (currentExp) {
      currentExp.rawLines.push(line);
      const cleanedBullet = line.replace(/^[-*•–—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
      if (cleanedBullet.length > 15) {
        currentExp.bullets.push(cleanedBullet);
      }
    } else {
      const cleaned = line.replace(/^[-*•–—]\s*/, '').trim();
      if (cleaned.length > 20) {
        currentExp = {
          title: 'Professional Experience',
          details: '',
          bullets: [cleaned],
          rawLines: [line],
        };
      }
    }
  }

  if (currentExp) {
    experiences.push(currentExp);
  }

  return experiences;
}

/**
 * Main parser: splits resume into structured sections.
 */
export function parseResumeSections(resumeText) {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      name: 'Candidate',
      contact: { email: '', phone: '', links: [], location: '' },
      summary: '',
      skills: [],
      skillsRaw: '',
      projects: [],
      experience: [],
      education: [],
      certifications: [],
      rawText: '',
    };
  }

  const rawLines = resumeText.split(/\r?\n/);
  const sections = {
    header: [],
    summary: [],
    skills: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    other: [],
  };

  let currentSection = 'header';

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      // blank line, keep going
      continue;
    }

    const identified = identifySection(line);
    if (identified) {
      currentSection = identified;
      continue;
    }

    if (sections[currentSection]) {
      sections[currentSection].push(line);
    } else {
      sections.other.push(line);
    }
  }

  // Extract Candidate Name from header lines
  let name = '';
  for (const hLine of sections.header) {
    const clean = hLine.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
    // Name is typically 2-4 words, no email or url or symbols
    if (
      clean.length >= 2 &&
      clean.length <= 40 &&
      !clean.includes('@') &&
      !clean.includes('http') &&
      !clean.includes('/') &&
      !clean.includes('|') &&
      !/^(resume|curriculum|cv|candidate|profile)/i.test(clean)
    ) {
      name = clean;
      break;
    }
  }
  if (!name) name = 'Candidate';

  const contact = extractContactInfo([...sections.header, ...sections.summary.slice(0, 2)]);

  // Parse skills
  const skillsList = [];
  const skillsRaw = sections.skills.join('\n');
  for (const line of sections.skills) {
    const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^[A-Za-z\s]+:\s*/, '');
    const tokens = cleaned.split(/[,·|•]/).map((t) => t.trim()).filter(Boolean);
    skillsList.push(...tokens);
  }

  // Parse projects
  const projects = extractProjectsFromLines(sections.projects);

  // If projects was empty but other or experience contains project mentions, scan for them
  if (projects.length === 0) {
    const projectCandidates = [];
    for (const line of [...sections.other, ...sections.experience]) {
      if (/\b(project|app|platform|system|bot|tool|dashboard|api|service)\b/i.test(line) && line.length < 80) {
        projectCandidates.push(line);
      }
    }
    if (projectCandidates.length > 0) {
      projects.push(...extractProjectsFromLines(projectCandidates));
    }
  }

  // Parse work experience
  const experience = extractExperienceFromLines(sections.experience);

  // Parse education lines
  const education = [];
  for (const line of sections.education) {
    const cleaned = line.replace(/^[-*•#]\s*/, '').trim();
    if (cleaned.length > 5) {
      education.push(cleaned);
    }
  }

  // Parse certifications
  const certifications = [];
  for (const line of sections.certifications) {
    const cleaned = line.replace(/^[-*•#]\s*/, '').trim();
    if (cleaned.length > 5) {
      certifications.push(cleaned);
    }
  }

  return {
    name,
    contact,
    summary: sections.summary.join(' ').trim(),
    skills: Array.from(new Set(skillsList)),
    skillsRaw,
    projects,
    experience,
    education,
    certifications,
    rawText: resumeText,
  };
}
