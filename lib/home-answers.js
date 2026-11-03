/** Shared, factual answers for the visible homepage and its structured data. */
export function homeAnswers({ total, hiringCount, sectorCount }) {
  const number = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-IN');
  return [
    {
      question: 'What is Mapping HYD Startups?',
      answer: 'Mapping HYD Startups is a free directory and interactive map of companies with offices in Hyderabad. It helps you explore companies by area, sector and funding stage, and find job openings linked to their sources. It includes startups and established employers; not every listing is a startup.',
      links: [{ href: '/about', label: 'About Mapping HYD Startups' }],
    },
    {
      question: 'How many Hyderabad companies are listed?',
      answer: `This directory snapshot contains ${number(total)} company listings across ${number(sectorCount)} sectors. This is the size of our directory, not an official count of all startups or companies in Hyderabad.`,
      links: [{ href: '/hyderabad-tech-statistics', label: 'Directory statistics and methodology' }],
    },
    {
      question: 'Where can I find startup jobs in Hyderabad?',
      answer: `${number(hiringCount)} listed companies have a hiring signal in this directory snapshot. Browse the jobs section for individual openings and the fresher section for early-career roles. A company count is not a vacancy count. Check the original employer posting before applying; roles can close between updates.`,
      links: [{ href: '/jobs', label: 'Jobs in Hyderabad' }, { href: '/jobs/fresher', label: 'Fresher and early-career jobs' }],
    },
    {
      question: 'How do I find companies in a particular Hyderabad area?',
      answer: 'Use the area filter on the map or browse the area directory for HITEC City, Gachibowli, Madhapur and other Hyderabad neighbourhoods. Company pages provide office and website details where available.',
      links: [{ href: '/areas', label: 'Browse companies by area' }, { href: '/industries', label: 'Browse companies by sector' }],
    },
    {
      question: 'How are company locations and job listings checked?',
      answer: 'Company locations are checked during review, but some map pins represent an approximate tech area rather than an exact office building. Job listings come from employer career pages, applicant tracking systems and job feeds. Check each company page and the original source for current details; a listing does not guarantee that a company is hiring.',
      links: [{ href: '/how-we-verify', label: 'How we verify companies and jobs' }, { href: '/submit', label: 'Submit a company' }],
    },
    {
      question: 'Is Mapping HYD Startups free, and who runs it?',
      answer: 'Browsing the map, company pages and jobs is free and does not require an account. Mapping HYD is an independent project by Shiva Chandra Takkelapati and Nitya Boyapati. Saving items and some member features require sign-in. Job applications are completed with the original employer or listing provider.',
      links: [{ href: '/about', label: 'Meet the people behind Mapping HYD' }],
    },
  ];
}

export function homeAnswerSchema(answers, site) {
  const url = `${site.replace(/\/$/, '')}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#directory`, url,
        name: 'Hyderabad Startup Map | Mapping HYD Startups',
        description: answers[0].answer,
        inLanguage: 'en-IN',
        isPartOf: { '@id': `${url}#website` },
        publisher: { '@id': `${url}#organization` },
        about: { '@type': 'Place', name: 'Hyderabad, Telangana, India' },
      },
      {
        '@type': 'FAQPage', '@id': `${url}#questions`, url: `${url}#questions`,
        isPartOf: { '@id': `${url}#directory` },
        mainEntity: answers.map(({ question, answer }) => ({
          '@type': 'Question', name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
}
