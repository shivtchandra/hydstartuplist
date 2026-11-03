import test from 'node:test';
import assert from 'node:assert/strict';
import { homeAnswers, homeAnswerSchema } from '../lib/home-answers.js';

test('zero hiring remains zero and directory counts do not claim a city census', () => {
  const answers = homeAnswers({ total: 1218, sectorCount: 24, hiringCount: 0 });
  assert.match(answers[1].answer, /1,218 company listings across 24 sectors/);
  assert.match(answers[1].answer, /not an official count/);
  assert.match(answers[2].answer, /^0 listed companies/);
  assert(!answers.some(({ answer }) => answer.includes('60+')));
});

test('structured questions and answers exactly match visible content inputs', () => {
  const answers = homeAnswers({ total: 8, sectorCount: 3, hiringCount: 2 });
  const graph = homeAnswerSchema(answers, 'https://startups.mapmyhyd.com/')['@graph'];
  const faq = graph.find(item => item['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), answers.map(a => [a.question, a.answer]));
  assert.equal(graph[0].isPartOf['@id'], 'https://startups.mapmyhyd.com/#website');
  assert(answers.flatMap(a => a.links).every(link => link.href.startsWith('/')));
});
