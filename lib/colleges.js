import { getSiteUrl } from "./site-url.js";

export const TELANGANA_COLLEGES = [
  {
    slug: "cbit-hyderabad",
    name: "Chaitanya Bharathi Institute of Technology (CBIT)",
    shortName: "CBIT Hyderabad",
    location: "Gandipet, Hyderabad",
    established: 1979,
    tier: "Tier 2 (Top State Autonomous)",
    nirfRankBand: "Rank 101–150 (NIRF Engineering)",
    overview:
      "CBIT is widely regarded as one of Telangana's premier private engineering institutions with a 45-year legacy. Located in Gandipet near Financial District, CBIT hosts major product and GCC recruiters annually.",
    stats: {
      batchSize: 1560,
      placedCount: 756,
      placementRate: "68%",
      medianCTC: "₹6.0 LPA",
      highestCTC: "₹54.0 LPA",
      totalOffers: "950+",
    },
    topRecruiters: [
      "Microsoft",
      "ServiceNow",
      "JPMC",
      "Wells Fargo",
      "Oracle",
      "Keka HR",
      "Darwinbox",
      "Cognizant",
      "TCS Digital",
    ],
    alumniStartups: ["Keka HR", "Edvizo", "Acrobits", "Smartbridge"],
    faq: [
      {
        question: "What is the average and median placement package at CBIT Hyderabad?",
        answer:
          "For the 2024–2026 batches, the median salary at CBIT stands at ₹6.0 LPA, with top product offers from Microsoft, ServiceNow, and JPMC reaching ₹40 LPA to ₹54 LPA.",
      },
      {
        question: "Which companies recruit the highest number of students from CBIT?",
        answer:
          "Major mass recruiters include Cognizant and TCS, while top product recruiters include ServiceNow, JPMC, Oracle, Wells Fargo, and Hyderabad SaaS startups like Keka and Darwinbox.",
      },
    ],
  },
  {
    slug: "vnr-vjiet-hyderabad",
    name: "VNR Vignana Jyothi Institute of Engineering & Technology",
    shortName: "VNR VJIET",
    location: "Bachupally, Nizampet, Hyderabad",
    established: 1995,
    tier: "Tier 2 (Top State Autonomous)",
    nirfRankBand: "Rank 101–150 (NIRF Engineering)",
    overview:
      "VNR VJIET in Bachupally is known for exceptional campus placement volumes, consistently generating over 2,000 offers across product companies, GCCs, and IT service giants.",
    stats: {
      batchSize: 2100,
      placedCount: 1107,
      placementRate: "72%",
      medianCTC: "₹6.5 LPA",
      highestCTC: "₹65.0 LPA (Historically ₹92 LPA)",
      totalOffers: "2,112 offers",
    },
    topRecruiters: [
      "Amazon",
      "Oracle OCI",
      "ServiceNow",
      "JPMorgan Chase",
      "Darwinbox",
      "NCR Voyix",
      "TCS Digital",
      "Accenture",
      "Capgemini",
    ],
    alumniStartups: ["StreetByte", "Recykal (alumni engineers)", "VisiAI"],
    faq: [
      {
        question: "How many offers does VNR VJIET receive during campus placements?",
        answer:
          "VNR VJIET students regularly secure over 2,000 total placement offers per academic year, with over 1,100 unique students placed across product and service firms.",
      },
      {
        question: "What is the highest package offered at VNR VJIET?",
        answer:
          "The highest international/product package reached ₹92 LPA, with regular domestic top packages ranging from ₹45 LPA to ₹65 LPA from Amazon and Oracle.",
      },
    ],
  },
  {
    slug: "vasavi-college-hyderabad",
    name: "Vasavi College of Engineering (VCE)",
    shortName: "Vasavi College",
    location: "Ibrahimbagh, Hyderabad",
    established: 1981,
    tier: "Tier 2 (Top State Autonomous)",
    nirfRankBand: "Rank 151–200 (NIRF Engineering)",
    overview:
      "Affiliated with Osmania University and located in Ibrahimbagh, Vasavi College is celebrated for strong coding culture and consistent high-package placements at ServiceNow and Oracle.",
    stats: {
      batchSize: 960,
      placedCount: 551,
      placementRate: "66.7%",
      medianCTC: "₹5.8 LPA",
      highestCTC: "₹47.5 LPA",
      totalOffers: "780+",
    },
    topRecruiters: [
      "ServiceNow",
      "Oracle",
      "Cisco",
      "Darwinbox",
      "HighRadius",
      "FactSet",
      "Infosys",
      "Accenture",
    ],
    alumniStartups: ["Zaggle (leadership alumni)", "Graphene AI"],
    faq: [
      {
        question: "What is the placement percentage at Vasavi College of Engineering?",
        answer:
          "According to NIRF disclosures, Vasavi records a placement rate of 66.7% for eligible graduating students, with a median package of ₹5.8 LPA.",
      },
    ],
  },
  {
    slug: "jntuh-hyderabad",
    name: "JNTUH University College of Engineering Hyderabad",
    shortName: "JNTUH CEH",
    location: "Kukatpally, Hyderabad",
    established: 1965,
    tier: "Tier 2 (Premier State University Campus)",
    nirfRankBand: "Rank 83 (NIRF Engineering)",
    overview:
      "The flagship engineering campus of Jawaharlal Nehru Technological University, located in Kukatpally right on the Hyderabad Metro corridor. Top destination for core engineering and software recruits.",
    stats: {
      batchSize: 1100,
      placedCount: 630,
      placementRate: "65%",
      medianCTC: "₹6.0 LPA",
      highestCTC: "₹52.0 LPA",
      totalOffers: "750+",
    },
    topRecruiters: [
      "AMD",
      "Qualcomm",
      "MathWorks",
      "Honeywell",
      "TCS",
      "Tech Mahindra",
      "BHEL",
    ],
    alumniStartups: ["Skyroot Aerospace (Pawan Chandana alumni connection)", "Dhruva Space"],
    faq: [
      {
        question: "Why is JNTUH CEH favored by semiconductor and hardware companies?",
        answer:
          "JNTUH Kukatpally has premier R&D labs and strong ECE/EEE departments that attract top semiconductor giants like AMD, Qualcomm, and Intel for chip design and embedded software roles.",
      },
    ],
  },
  {
    slug: "iiit-hyderabad",
    name: "International Institute of Information Technology Hyderabad",
    shortName: "IIIT Hyderabad",
    location: "Gachibowli, Hyderabad",
    established: 1998,
    tier: "Tier 1 (National Premier Research)",
    nirfRankBand: "Rank 55 (NIRF Engineering) / Top 5 CS Research in India",
    overview:
      "One of India's premier autonomous research universities in computer science, computer vision, AI, and systems engineering. Houses the Centre for Innovation and Entrepreneurship (CIE).",
    stats: {
      batchSize: 450,
      placedCount: 390,
      placementRate: "88%",
      medianCTC: "₹32.0 LPA (B.Tech CSE)",
      highestCTC: "₹1.02 Crore+",
      totalOffers: "500+",
    },
    topRecruiters: [
      "Google",
      "Apple",
      "Uber",
      "Meta",
      "Tower Research",
      "DE Shaw",
      "Adobe",
      "NVIDIA",
      "Qualcomm",
    ],
    alumniStartups: ["TakeMe2Space", "Logy.AI", "Perceptyne", "Harvested Robotics", "Aganitha AI"],
    faq: [
      {
        question: "What is the average salary at IIIT Hyderabad?",
        answer:
          "B.Tech CSE graduates at IIIT Hyderabad command a median CTC of ₹32.0 LPA, with top domestic packages exceeding ₹65 LPA and international HFT offers crossing ₹1 Crore+.",
      },
    ],
  },
  {
    slug: "iit-hyderabad",
    name: "Indian Institute of Technology Hyderabad",
    shortName: "IIT Hyderabad",
    location: "Kandi, Sangareddy, Hyderabad Outer",
    established: 2008,
    tier: "Tier 1 (Institute of National Importance)",
    nirfRankBand: "Rank 8 (NIRF Engineering)",
    overview:
      "Ranked #8 in India, IIT Hyderabad is a global powerhouse for deeptech, semiconductor research, quantum computing, and AI systems with extensive Japanese industry collaborations.",
    stats: {
      batchSize: 750,
      placedCount: 460,
      placementRate: "62%",
      medianCTC: "₹20.0 LPA",
      highestCTC: "₹90.0 LPA+",
      totalOffers: "600+",
    },
    topRecruiters: [
      "Google",
      "Microsoft",
      "Rakuten",
      "Sony Japan",
      "TSMC",
      "NVIDIA",
      "Goldman Sachs",
      "Texas Instruments",
    ],
    alumniStartups: ["Pure EV (IIT-H incubated)", "PuRE Energy"],
    faq: [
      {
        question: "What companies recruit from IIT Hyderabad?",
        answer:
          "IIT Hyderabad hosts over 150+ domestic and international recruiters including Japanese tech giants (Rakuten, Sony, Suzuki), global tech firms (Google, Microsoft), and hardware innovators (Texas Instruments, NVIDIA).",
      },
    ],
  },
  {
    slug: "cvr-college-hyderabad",
    name: "CVR College of Engineering",
    shortName: "CVR College",
    location: "Vastunagar, Mangalpalli, Ibrahimpatnam",
    established: 2001,
    tier: "Tier 2 (Top State Autonomous)",
    nirfRankBand: "Rank 151–200 (NIRF Engineering)",
    overview:
      "Located in Vastunagar, CVR College is a renowned autonomous engineering college in Telangana with rigorous academic discipline and strong IT service placements.",
    stats: {
      batchSize: 1300,
      placedCount: 710,
      placementRate: "58%",
      medianCTC: "₹5.2 LPA",
      highestCTC: "₹38.0 LPA",
      totalOffers: "900+",
    },
    topRecruiters: [
      "Cognizant",
      "Capgemini",
      "Virtusa",
      "Accenture",
      "TCS",
      "Darwinbox",
      "Tech Mahindra",
    ],
    alumniStartups: ["TechVast", "CloudOrbit"],
    faq: [
      {
        question: "What is the average package at CVR College of Engineering?",
        answer:
          "The average compensation package at CVR College ranges between ₹4.8 LPA and ₹5.5 LPA, with top software development offers reaching ₹30 LPA+.",
      },
    ],
  },
  {
    slug: "griet-hyderabad",
    name: "Gokaraju Rangaraju Institute of Engineering & Technology",
    shortName: "GRIET Hyderabad",
    location: "Bachupally, Kukatpally, Hyderabad",
    established: 1997,
    tier: "Tier 2 (Top State Autonomous)",
    nirfRankBand: "Rank 101–150 (NIRF Engineering)",
    overview:
      "Situated in Bachupally, GRIET is a premier autonomous engineering college known for active student clubs, coding hackathons, and high-volume campus hiring by Tier-1 IT companies.",
    stats: {
      batchSize: 1400,
      placedCount: 780,
      placementRate: "62%",
      medianCTC: "₹5.5 LPA",
      highestCTC: "₹44.0 LPA",
      totalOffers: "1,050+",
    },
    topRecruiters: [
      "Amazon",
      "TCS Digital",
      "Accenture",
      "Cognizant",
      "ServiceNow",
      "Darwinbox",
      "Hexagon",
    ],
    alumniStartups: ["Eventify", "CodeCrafters Hyd"],
    faq: [
      {
        question: "What is the placement record of GRIET Hyderabad?",
        answer:
          "GRIET consistently achieves over 1,000 total job offers per year with a median package of ₹5.5 LPA and highest offers exceeding ₹40 LPA.",
      },
    ],
  },
];

export function getCollegeBySlug(slug) {
  return TELANGANA_COLLEGES.find((c) => c.slug === slug) || null;
}
