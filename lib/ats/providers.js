/** Board URL builders and raw list extractors per ATS provider. */

export const ATS_PROVIDERS = [
  "greenhouse",
  "lever",
  "ashby",
  "recruitee",
  "workable",
  "breezy",
  "smartrecruiters",
];
// phenom / eightfold / radancy / workday are jobs-only employer feeds (see EMPLOYER_FEED_META),
// not included in ATS_PROVIDERS so classify slug-probes stay fast.


/** Known jobs-only employer board configs (Hyd location pre-filtered where possible). */
export const EMPLOYER_FEED_META = {
  "phenom:amd": {
    apiUrl:
      "https://careers.amd.com/api/jobs?location=Hyderabad,%20Telangana,%20India&woe=7&regionCode=IN&stretchUnit=MILES&stretch=10&sortBy=relevance&descending=false",
    boardUrl:
      "https://careers.amd.com/careers-home/jobs?location=Hyderabad,%20Telangana,%20India&woe=7&regionCode=IN&stretchUnit=MILES&stretch=10&page=1",
    paginate: "phenom-page",
    pageSize: 10,
  },
  "eightfold:qualcomm": {
    apiUrl:
      "https://careers.qualcomm.com/api/pcsx/search?domain=qualcomm.com&query=&location=Hyderabad,%20TS,%20India&num=50&sort_by=distance&filter_distance=80",
    boardUrl:
      "https://careers.qualcomm.com/careers?location=Hyderabad%2C++TS%2C++India&sort_by=distance&filter_distance=80",
    jobUrlBase: "https://careers.qualcomm.com",
    paginate: "eightfold-start",
    pageSize: 50,
  },
  "radancy:synchrony": {
    apiUrl:
      "https://www.synchronycareers.com/search-jobs/results?ActiveFacetID=0&CurrentPage=1&RecordsPerPage=50&DistanceUnit=Km&Keywords=&Location=Hyderabad&Latitude=&Longitude=&ShowRadius=False&CustomFacetName=&FacetTerm=&FacetType=0&SearchResultsModuleName=Search+Results&SearchFiltersModuleName=Search+Filters&SortCriteria=0&SortDirection=0&SearchType=5&PostalCode=&ResultsType=0&fc=&fl=&fcf=&afc=&afl=&afcf=",
    boardUrl: "https://www.synchronycareers.com/search-jobs",
    jobUrlBase: "https://www.synchronycareers.com",
    paginate: null,
  },
  "workday:centific": {
    apiUrl: "https://centific.wd1.myworkdayjobs.com/wday/cxs/centific/Centific_Global/jobs",
    boardUrl:
      "https://centific.wd1.myworkdayjobs.com/Centific_Global?Country=c4f78be1a8f14da0ab49ce1162348a5e",
    jobUrlBase: "https://centific.wd1.myworkdayjobs.com/en-US/Centific_Global",
    paginate: "workday-cxs",
    pageSize: 20,
    appliedFacets: { Country: ["c4f78be1a8f14da0ab49ce1162348a5e"] },
  },

  "workday:ncr": {
    apiUrl: "https://ncr.wd1.myworkdayjobs.com/wday/cxs/ncr/ext_apac/jobs",
    boardUrl:
      "https://ncr.wd1.myworkdayjobs.com/ext_apac?Location_Country=c4f78be1a8f14da0ab49ce1162348a5e&Location_Region_State_Province=3cfc61cd0cf4100004b86c8483b80007",
    jobUrlBase: "https://ncr.wd1.myworkdayjobs.com/en-US/ext_apac",
    paginate: "workday-cxs",
    pageSize: 20,
    appliedFacets: {
      Location_Country: ["c4f78be1a8f14da0ab49ce1162348a5e"],
      Location_Region_State_Province: ["3cfc61cd0cf4100004b86c8483b80007"],
    },
  },
  "workday:kantar": {
    apiUrl: "https://kantar.wd3.myworkdayjobs.com/wday/cxs/kantar/KANTAR/jobs",
    boardUrl: "https://careers.kantar.com/job-search?City=Hyderabad",
    jobUrlBase: "https://kantar.wd3.myworkdayjobs.com/en-US/KANTAR",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "Hyderabad",
    appliedFacets: {},
  },
  "eightfold:worley": {
    apiUrl:
      "https://jobs.worley.com/api/pcsx/search?domain=worley.com&query=&location=Hyderabad,%20Telangana,%20India&num=50&sort_by=distance&filter_distance=160",
    boardUrl:
      "https://jobs.worley.com/careers?location=Hyderabad%2C++Telangana%2C++India&sort_by=distance&filter_distance=160",
    jobUrlBase: "https://jobs.worley.com",
    paginate: "eightfold-start",
    pageSize: 50,
  },
  "eightfold:bms": {
    apiUrl:
      "https://jobs.bms.com/api/pcsx/search?domain=bms.com&query=&location=Hyderabad,%20TS,%20India&num=50&sort_by=distance&filter_distance=80",
    boardUrl:
      "https://jobs.bms.com/careers?location=Hyderabad%2C++TS%2C++India&sort_by=distance&filter_distance=80",
    jobUrlBase: "https://jobs.bms.com",
    paginate: "eightfold-start",
    pageSize: 50,
  },
  "oraclecloud:dieboldnixdorf": {
    apiUrl:
      "https://eeug.fa.us6.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.workLocation&finder=findReqs%3BsiteNumber%3DCX%2Climit%3D50%2ClastSelectedFacet%3DLOCATIONS%2CselectedLocationsFacet%3D300000148073556%2CsortBy%3DPOSTING_DATES_DESC",
    boardUrl:
      "https://eeug.fa.us6.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/jobs?location=Hyderabad%2C+Telangana%2C+India&locationId=300000148073556&locationLevel=city&mode=location&radius=25&radiusUnit=MI",
    jobUrlBase:
      "https://eeug.fa.us6.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/",
    paginate: null,
  },
  "workday:tjx": {
    apiUrl: "https://tjx.wd1.myworkdayjobs.com/wday/cxs/tjx/TJX_EXTERNAL/jobs",
    boardUrl: "https://jobs.tjx.com/global/en/india-jobs",
    jobUrlBase: "https://tjx.wd1.myworkdayjobs.com/en-US/TJX_EXTERNAL",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "Hyderabad",
    appliedFacets: {},
  },
  "gr8people:teradata": {
    apiUrl: "https://careers.teradata.com/graphql",
    boardUrl: "https://careers.teradata.com/jobs?location=Hyderabad%2C+TS",
    paginate: "gr8people-graphql",
    pageSize: 50,
    locationFilter: { lat: 17.385, lng: 78.4867, radius: 50 },
  },
  "htmlcareers:leomarcom": {
    apiUrl: "https://www.leomarcom.com/careers/",
    boardUrl: "https://www.leomarcom.com/careers/",
    jobUrlBase: "https://www.leomarcom.com",
    paginate: "html-careers",
  },
  "phenom:viasat": {
    apiUrl:
      "https://careers.viasat.com/api/jobs?stretchUnit=MILES&stretch=39&location=Hyderabad,%20Telangana,%20India&woe=7&regionCode=IN&limit=39",
    boardUrl:
      "https://careers.viasat.com/jobs?stretchUnit=MILES&stretch=39&location=Hyderabad,%20Telangana,%20India&woe=7&regionCode=IN&limit=39&page=1",
    jobUrlBase: "https://careers.viasat.com/jobs",
    paginate: "phenom-page",
    pageSize: 39,
  },
  "linkedin:sentient": {
    apiUrl:
      "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?f_C=74974362&geoId=102713980&start=0",
    boardUrl:
      "https://www.linkedin.com/jobs/search-results/?keywords=jobs&origin=COMPANY_PAGE_JOBS_CLUSTER_EXPANSION&geoId=102713980&f_C=74974362",
    companyId: "74974362",
    geoId: "102713980",
    paginate: "linkedin-guest",
  },
  "linkedin:gbit": {
    apiUrl:
      "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?f_C=3113804&geoId=102713980&start=0",
    boardUrl:
      "https://www.linkedin.com/jobs/search-results/?keywords=jobs&origin=COMPANY_PAGE_JOBS_CLUSTER_EXPANSION&geoId=102713980&f_C=3113804",
    companyId: "3113804",
    geoId: "102713980",
    paginate: "linkedin-guest",
  },
  "linkedin:talentformula": {
    apiUrl:
      "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?f_C=27401244&geoId=102713980&start=0",
    boardUrl:
      "https://www.linkedin.com/jobs/search-results/?geoId=102713980&f_C=27401244",
    companyId: "27401244",
    geoId: "102713980",
    paginate: "linkedin-guest",
  },
  "accufy:accufy": {
    apiUrl: "https://accufy.in/api/config/allJobs",
    boardUrl: "https://accufy.in/careerPage",
    jobUrlBase: "https://accufy.in/career",
    paginate: "accufy-config",
  },
  "workday:wbd": {
    apiUrl: "https://warnerbros.wd5.myworkdayjobs.com/wday/cxs/warnerbros/global/jobs",
    boardUrl: "https://careers.wbd.com/global/en/hyderabad-jobs",
    jobUrlBase: "https://warnerbros.wd5.myworkdayjobs.com/en-US/global",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "Hyderabad",
    appliedFacets: {},
  },
  "keka:cognida": {
    apiUrl:
      "https://cognida.keka.com/careers/api/embedjobs/default/active/22612058-82aa-4bfd-9017-771ca36cd0e3",
    boardUrl: "https://www.cognida.ai/careers/",
    jobUrlBase: "https://cognida.keka.com/careers/jobdetails",
    paginate: "keka-embed",
  },
  "keka:ideyalabs": {
    apiUrl:
      "https://ideyalabs.keka.com/careers/api/embedjobs/default/active/a23dabad-d0d8-4a09-98fc-c66cb768a79e",
    boardUrl: "https://www.ideyalabs.com/careers/",
    jobUrlBase: "https://ideyalabs.keka.com/careers/jobdetails",
    paginate: "keka-embed",
  },
  "htmlcareers:tetrasoft": {
    apiUrl: "https://www.tetrasoft.us/careers.html",
    boardUrl: "https://www.tetrasoft.us/careers.html",
    jobUrlBase: "https://www.tetrasoft.us/careers.html",
    paginate: "html-careers",
    scrapeMode: "tetrasoft",
  },
  "workday:elevancehealth": {
    apiUrl:
      "https://elevancehealth.wd1.myworkdayjobs.com/wday/cxs/elevancehealth/carelonglobal_in/jobs",
    boardUrl:
      "https://elevancehealth.wd1.myworkdayjobs.com/en-US/carelonglobal_in?locations=3ad9dca462c50101e6901d9d26fb0000",
    jobUrlBase: "https://elevancehealth.wd1.myworkdayjobs.com/en-US/carelonglobal_in",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "",
    appliedFacets: { locations: ["3ad9dca462c50101e6901d9d26fb0000"] },
    // Facet is Hyderabad; list API may show Bangalore as primary path for multi-loc roles
    prefilteredHyd: true,
    defaultLocation: "Hyderabad, Telangana, India",
  },
  "oraclecloud:honeywell": {
    apiUrl:
      "https://ibqbjb.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.workLocation&finder=findReqs%3BsiteNumber%3DHoneywell%2Climit%3D50%2ClastSelectedFacet%3DLOCATIONS%2CselectedLocationsFacet%3D100000013406729%2CsortBy%3DPOSTING_DATES_DESC",
    boardUrl:
      "https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/Honeywell/jobs?location=Hyderabad%2C+Telangana%2C+India&locationId=100000013406729&locationLevel=city&mode=location&radius=25&radiusUnit=MI",
    jobUrlBase:
      "https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/Honeywell/job/",
    paginate: null,
  },
  "htmlcareers:keystoneeducation": {
    apiUrl: "https://www.keystoneeducation.in/careers",
    boardUrl: "https://www.keystoneeducation.in/careers",
    jobUrlBase: "https://www.keystoneeducation.in/careers",
    paginate: "html-careers",
    scrapeMode: "keystone",
    prefilteredHyd: true,
    defaultLocation: "Financial District, Hyderabad",
  },
  "htmlcareers:thegaudium": {
    apiUrl: "https://www.thegaudium.com/at-the-gaudium/careers/",
    boardUrl: "https://www.thegaudium.com/at-the-gaudium/careers/",
    jobUrlBase: "https://www.thegaudium.com/at-the-gaudium/careers/",
    paginate: "html-careers",
    scrapeMode: "gaudium",
    prefilteredHyd: true,
    defaultLocation: "Hyderabad, Telangana",
  },
  "workday:blueyonder": {
    apiUrl: "https://jda.wd5.myworkdayjobs.com/wday/cxs/jda/JDA_Careers/jobs",
    boardUrl: "https://careers.blueyonder.com/us/en/search-results",
    jobUrlBase: "https://jda.wd5.myworkdayjobs.com/en-US/JDA_Careers",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "Hyderabad",
    appliedFacets: {},
  },
  "zoho:productspace": {
    apiUrl:
      "https://productspace.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers",
    boardUrl: "https://productspace.zohorecruit.in/jobs/Careers",
    paginate: "zoho-recruit",
  },
  "zoho:indiumsoft": {
    apiUrl:
      "https://indiumsoft.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers",
    boardUrl: "https://indiumsoft.zohorecruit.com/jobs/Careers",
    paginate: "zoho-recruit",
  },
  "htmlcareers:wise": {
    apiUrl: "https://wise.jobs/jobs?options=364&page=1&size=48",
    boardUrl: "https://wise.jobs/jobs?options=364&page=1&size=48",
    jobUrlBase: "https://wise.jobs",
    paginate: "html-careers",
    scrapeMode: "wise",
  },
  "htmlcareers:brillio": {
    apiUrl: "https://careers.brillio.com/job-listing/?job_location=Hyderabad",
    boardUrl: "https://careers.brillio.com/job-listing/",
    jobUrlBase: "https://careers.brillio.com",
    paginate: "html-careers",
    scrapeMode: "brillio",
  },
  "htmlcareers:loreal": {
    apiUrl:
      "https://careers.loreal.com/en_US/jobs/SearchJobs?3_110_3=18031&3_284_3=62924186&listFilterMode=1&jobRecordsPerPage=50",
    boardUrl:
      "https://careers.loreal.com/en_US/jobs/SearchJobs?3_110_3=18031&3_284_3=62924186",
    jobUrlBase: "https://careers.loreal.com",
    paginate: "html-careers",
    scrapeMode: "avature",
  },
  "successfactors:fujitsu": {
    apiUrl: "https://www.jobs.global.fujitsu.com/services/recruiting/v1/jobs",
    boardUrl:
      "https://www.jobs.global.fujitsu.com/search/?q=&locationsearch=hyderabad&searchResultView=LIST",
    jobUrlBase: "https://www.jobs.global.fujitsu.com/job",
    paginate: "successfactors-jobs2web",
    pageSize: 10,
    searchLocation: "Hyderabad",
    locale: "en_US",
  },
  // SmartRecruiters default boardMeta has no country filter; India facet keeps Hyd in one page.
  "smartrecruiters:sutherland": {
    apiUrl:
      "https://api.smartrecruiters.com/v1/companies/sutherland/postings?country=in&limit=100",
    boardUrl: "https://jobs.smartrecruiters.com/sutherland",
    jobUrlBase: "https://jobs.smartrecruiters.com/sutherland",
    paginate: null,
  },
  "htmlcareers:gbb": {
    apiUrl: "https://www.gbb.co.in/careers/",
    boardUrl: "https://www.gbb.co.in/careers/",
    jobUrlBase: "https://www.gbb.co.in",
    paginate: "html-careers",
    scrapeMode: "wordpress-jobs",
    prefilteredHyd: true,
    defaultLocation: "Hyderabad, Telangana",
  },
  "linkedin:algonox": {
    apiUrl:
      "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?f_C=13292742&geoId=102713980&start=0",
    boardUrl:
      "https://www.linkedin.com/jobs/search-results/?geoId=102713980&f_C=13292742",
    companyId: "13292742",
    geoId: "102713980",
    paginate: "linkedin-guest",
  },
  "workday:jadeglobal": {
    apiUrl:
      "https://jadeglobal.wd5.myworkdayjobs.com/wday/cxs/jadeglobal/jade_careers/jobs",
    boardUrl:
      "https://jadeglobal.wd5.myworkdayjobs.com/en-US/jade_careers?locations=8bedb2882e801001b6c65e6fcc630000",
    jobUrlBase: "https://jadeglobal.wd5.myworkdayjobs.com/en-US/jade_careers",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "",
    appliedFacets: {
      locations: [
        "8bedb2882e801001b6c63b8011300000", // Hyderabad
        "8bedb2882e801001b6c65e6fcc630000", // Hyderabad, Telangana
      ],
    },
  },
  "workday:flutter": {
    apiUrl:
      "https://flutterbe.wd3.myworkdayjobs.com/wday/cxs/flutterbe/group_external/jobs",
    boardUrl:
      "https://flutterbe.wd3.myworkdayjobs.com/en-US/group_external?q=Hyderabad",
    jobUrlBase: "https://flutterbe.wd3.myworkdayjobs.com/en-US/group_external",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "Hyderabad",
    appliedFacets: {},
  },
  "workday:kyndrylearly": {
    apiUrl:
      "https://kyndryl.wd5.myworkdayjobs.com/wday/cxs/kyndryl/KyndrylEarlyCareers/jobs",
    boardUrl:
      "https://kyndryl.wd5.myworkdayjobs.com/en-US/KyndrylEarlyCareers?locations=87f83995f87010001211ab0c2b4d0000",
    jobUrlBase: "https://kyndryl.wd5.myworkdayjobs.com/en-US/KyndrylEarlyCareers",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "",
    appliedFacets: { locations: ["87f83995f87010001211ab0c2b4d0000"] },
  },
  "workday:invesco": {
    apiUrl: "https://invesco.wd1.myworkdayjobs.com/wday/cxs/invesco/IVZ/jobs",
    boardUrl:
      "https://invesco.wd1.myworkdayjobs.com/en-US/IVZ?q=Hyderabad",
    jobUrlBase: "https://invesco.wd1.myworkdayjobs.com/en-US/IVZ",
    paginate: "workday-cxs",
    pageSize: 20,
    searchText: "Hyderabad",
    appliedFacets: {},
  },
  "phenom:statestreet": {
    // careers.statestreet.com is Phenom; widgets refineSearch for Hyd city.
    apiUrl: "https://careers.statestreet.com/widgets",
    boardUrl:
      "https://careers.statestreet.com/global/en/search-results?keywords=&location=Hyderabad",
    jobUrlBase: "https://careers.statestreet.com/global/en/job",
    paginate: "phenom-widgets",
    pageSize: 20,
    widgetsBody: {
      lang: "en_global",
      deviceType: "desktop",
      countryCode: "IN",
      pageName: "search-results",
      ddoKey: "refineSearch",
      siteType: "external",
      global: true,
      jobs: true,
      counts: true,
      selected_fields: { city: ["Hyderabad"] },
    },
  },
  "phenom:cigna": {
    // jobs.thecignagroup.com is Phenom; widgets refineSearch for Hyd city.
    apiUrl: "https://jobs.thecignagroup.com/widgets",
    boardUrl:
      "https://jobs.thecignagroup.com/us/en/search-results?keywords=&location=Hyderabad",
    jobUrlBase: "https://jobs.thecignagroup.com/us/en/job",
    paginate: "phenom-widgets",
    pageSize: 20,
    widgetsBody: {
      lang: "en_us",
      deviceType: "desktop",
      countryCode: "IN",
      pageName: "search-results",
      ddoKey: "refineSearch",
      siteType: "external",
      global: true,
      jobs: true,
      counts: true,
      selected_fields: { city: ["Hyderabad"] },
    },
  },
  "phenom:roche": {
    // careers.roche.com is Phenom; /api/jobs 500s — use widgets refineSearch instead.
    apiUrl: "https://careers.roche.com/widgets",
    boardUrl:
      "https://careers.roche.com/global/en/search-results?keywords=&location=Hyderabad,%20India",
    jobUrlBase: "https://careers.roche.com/global/en/job",
    paginate: "phenom-widgets",
    pageSize: 20,
    widgetsBody: {
      lang: "en_global",
      deviceType: "desktop",
      countryCode: "IN",
      pageName: "search-results",
      ddoKey: "refineSearch",
      pageId: "page11",
      siteType: "external",
      global: true,
      jobs: true,
      counts: true,
      jdsource: "facets",
      selected_fields: { city: ["Hyderabad"] },
    },
  },
  "jobsyn:ibm": {
    // ibm.dejobs.org Nuxt shell; DirectEmployers jobsyn Solr scoped by X-Origin.
    apiUrl:
      "https://prod-search-api.jobsyn.org/api/v1/solr/search?location=Hyderabad&page=1&rows=10",
    boardUrl: "https://ibm.dejobs.org/locations/hyderabad-ind/jobs/?vs=5087",
    jobUrlBase: "https://careers.ibm.com/en_US/careers/JobDetail",
    paginate: "jobsyn-solr",
    pageSize: 10,
    xOrigin: "ibm.dejobs.org",
    viewSource: "5087",
    prefilteredHyd: true,
    defaultLocation: "Hyderabad, India",
  },

};

export function boardMeta(provider, slug, { withContent = true } = {}) {
  const s = String(slug || "").toLowerCase();
  switch (provider) {
    case "greenhouse":
      return {
        apiUrl: withContent
          ? `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`
          : `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`,
        boardUrl: `https://boards.greenhouse.io/${s}`,
      };
    case "lever":
      return {
        apiUrl: `https://api.lever.co/v0/postings/${s}?mode=json`,
        boardUrl: `https://jobs.lever.co/${s}`,
      };
    case "ashby":
      return {
        apiUrl: `https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`,
        boardUrl: `https://jobs.ashbyhq.com/${s}`,
      };
    case "recruitee":
      return {
        apiUrl: `https://${s}.recruitee.com/api/offers/`,
        boardUrl: `https://${s}.recruitee.com/`,
      };
    case "workable":
      return {
        apiUrl: `https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`,
        boardUrl: `https://apply.workable.com/${s}/`,
      };
    case "breezy":
      return {
        apiUrl: `https://${s}.breezy.hr/api/v1/jobs`,
        boardUrl: `https://${s}.breezy.hr/`,
      };
    case "smartrecruiters": {
      const feed = EMPLOYER_FEED_META[`smartrecruiters:${s}`];
      if (feed) return { ...feed };
      return {
        apiUrl: `https://api.smartrecruiters.com/v1/companies/${s}/postings`,
        boardUrl: `https://jobs.smartrecruiters.com/${s}`,
      };
    }
    case "phenom":
    case "eightfold":
    case "radancy":
    case "workday":
    case "oraclecloud":
    case "gr8people":
    case "htmlcareers":
    case "linkedin":
    case "zoho":
    case "successfactors":
    case "accufy":
    case "keka":
    case "jobsyn": {
      const key = `${provider}:${s}`;
      const feed = EMPLOYER_FEED_META[key];
      if (!feed) return null;
      return { ...feed };
    }
    default:
      return null;
  }
}

export function extractRawJobs(provider, data) {
  if (!data) return null;
  if (provider === "greenhouse") return data.jobs || null;
  if (provider === "lever") return Array.isArray(data) ? data : null;
  if (provider === "ashby") return data.jobs || null;
  if (provider === "recruitee") return data.offers || null;
  if (provider === "workable") return data.jobs || null;
  if (provider === "breezy") return Array.isArray(data) ? data : null;
  if (provider === "smartrecruiters") return data.content || null;
  if (provider === "phenom") return data.jobs || null;
  if (provider === "eightfold") return data?.data?.positions || data.positions || null;
  if (provider === "radancy") return Array.isArray(data) ? data : null; // pre-parsed list
  if (provider === "workday") return data.jobPostings || null;
  if (provider === "oraclecloud") {
    const items = data?.items || [];
    return items[0]?.requisitionList || null;
  }
  if (provider === "gr8people") return data?.nodes || (Array.isArray(data) ? data : null);
  if (provider === "htmlcareers") return Array.isArray(data) ? data : null;
  if (provider === "linkedin") return Array.isArray(data) ? data : null;
  if (provider === "zoho") return data?.data || (Array.isArray(data) ? data : null);
  if (provider === "successfactors") return data?.jobSearchResult || (Array.isArray(data) ? data : null);
  if (provider === "accufy") {
    const v = data?.value;
    return Array.isArray(v) ? v : Array.isArray(data) ? data : null;
  }
  if (provider === "keka") return Array.isArray(data) ? data : data?.data || null;
  if (provider === "jobsyn") return data.jobs || null;
  return null;
}

export function locationOf(provider, job) {
  if (provider === "greenhouse") return job.location?.name || "";
  if (provider === "lever") return job.categories?.location || "";
  if (provider === "ashby") {
    return (
      job.location ||
      job.locationName ||
      (Array.isArray(job.addressLocality) ? job.addressLocality.join(" ") : "") ||
      ""
    );
  }
  if (provider === "recruitee") return `${job.city || ""} ${job.country || ""} ${job.location || ""}`;
  if (provider === "workable") return `${job.city || ""} ${job.country || ""} ${job.location?.city || ""}`;
  if (provider === "breezy") return `${job.location?.city || ""} ${job.location?.country?.name || ""}`;
  if (provider === "smartrecruiters") {
    return (
      job.location?.fullLocation ||
      `${job.location?.city || ""} ${job.location?.region || ""} ${job.location?.country || ""}`
    );
  }
  if (provider === "phenom") {
    const j = job.data || job;
    return (
      j.full_location ||
      j.short_location ||
      [j.city, j.state, j.country].filter(Boolean).join(", ") ||
      j.location ||
      ""
    );
  }
  if (provider === "eightfold") {
    const locs = job.locations || [];
    return Array.isArray(locs) ? locs.join(", ") : String(locs || "");
  }
  if (provider === "radancy") return job.location || "";
  if (provider === "workday") {
    const locsText = job.locationsText ? String(job.locationsText) : "";
    // "2 Locations" / "3 Locations" is useless — fall through to path
    if (locsText && !/^\d+\s+Locations?$/i.test(locsText.trim())) return locsText;
    const locs = job.locations || [];
    const fromArr = Array.isArray(locs) ? locs.filter(Boolean).join(", ") : String(locs || "");
    if (fromArr) return fromArr;
    // List API often has empty locations[]; path is like /job/India-Office---Hyderabad/...
    const path = String(job.externalPath || "");
    if (/hyderabad/i.test(path)) return "Hyderabad, India";
    if (/telangana|\bTS\b/i.test(path)) return "Telangana, India";
    if (/india/i.test(path)) return "India";
    return path.replace(/[-_/]+/g, " ").trim() || locsText;
  }
  if (provider === "oraclecloud") return job.PrimaryLocation || "";
  if (provider === "gr8people") {
    const places = job.places?.nodes || [];
    const hyd = places.find((p) => /hyderabad/i.test(p?.name || ""));
    if (hyd?.name) return hyd.name;
    return places.map((p) => p?.name).filter(Boolean).join("; ") || "";
  }
  if (provider === "htmlcareers") return job.location || "";
  if (provider === "linkedin") return job.location || "";
  if (provider === "jobsyn") {
    return (
      job.location_exact ||
      [job.city_exact, job.country_exact].filter(Boolean).join(", ") ||
      ""
    );
  }
  if (provider === "zoho") {
    return [job.City, job.State, job.Country].filter(Boolean).join(", ");
  }
  if (provider === "successfactors") {
    const resp = job.response || job;
    const shorts = resp.jobLocationShort || [];
    return Array.isArray(shorts) ? shorts.join("; ") : String(shorts || "");
  }
  if (provider === "accufy") return job.location || "";
  if (provider === "keka") {
    if (job.location) return String(job.location);
    if (job.jobLocation) return String(job.jobLocation);
    const locs = job.locations || job.jobLocations || [];
    if (Array.isArray(locs) && locs.length) {
      const joined = locs
        .map((l) => (typeof l === "string" ? l : l?.name || l?.city || ""))
        .filter(Boolean)
        .join("; ");
      if (joined) return joined;
    }
    // Keka often puts location in HTML description (with &nbsp; before :)
    const desc = String(job.description || "").replace(/&nbsp;/gi, " ");
    const m = desc.match(/Location[^:<]*[:：]\s*([^<\n]+)/i);
    if (m) return m[1].replace(/\s+/g, " ").trim();
    if (/hyderabad/i.test(desc)) return "Hyderabad";
    return "";
  }
  return "";
}

export const HTML_ATS_PATTERNS = [
  { provider: "greenhouse", regex: /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/i },
  { provider: "lever", regex: /jobs\.lever\.co\/([a-z0-9_-]+)/i },
  { provider: "ashby", regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i },
  { provider: "recruitee", regex: /([a-z0-9_-]+)\.recruitee\.com/i },
  { provider: "workable", regex: /apply\.workable\.com\/([a-z0-9_-]+)/i },
  { provider: "breezy", regex: /([a-z0-9_-]+)\.breezy\.hr/i },
  { provider: "smartrecruiters", regex: /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/i },
];
