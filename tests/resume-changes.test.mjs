import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeHtml, resumePrintDocument } from '../lib/resume/layout.js';

test('highlights rewritten words while leaving moved and unchanged lines alone', () => {
  const original = 'Alex Rao\nSUMMARY\nBuilt React dashboards for support teams.\nSKILLS\nReact, JavaScript';
  const revised = 'Alex Rao\nSKILLS\nReact, JavaScript\nSUMMARY\nBuilt accessible React dashboards for support teams.';
  const html = resumeHtml(revised, { original });
  assert.match(html, /<mark class="rz-change">accessible<\/mark>/);
  assert.equal((html.match(/rz-change/g) || []).length, 1);
  assert.doesNotMatch(resumeHtml(revised), /rz-change/);
  assert.doesNotMatch(resumePrintDocument(revised), /class="rz-change"/);
});

test('highlighting preserves links, bold formatting, entities and escaping', () => {
  const original = 'Alex Rao\nSUMMARY\nBuilt **React** dashboards & reports.\n[Portfolio](https://example.com/alex)';
  const revised = 'Alex Rao\nSUMMARY\nBuilt **accessible React** dashboards & reports.\n[Portfolio](https://example.com/alex)\n<img src=x onerror=alert(1)>';
  const html = resumeHtml(revised, { original });
  assert.match(html, /<b><mark class="rz-change">accessible<\/mark> React<\/b>/);
  assert.match(html, /href="https:\/\/example.com\/alex"/);
  assert.match(html, /&amp;/);
  assert.doesNotMatch(html, /<img|<script|href="javascript:/);
  assert.equal(html.replace(/<mark class="rz-change">|<\/mark>/g, ''), resumeHtml(revised));
});

test('new sections are highlighted without highlighting retained dates', () => {
  const original = 'Alex Rao\nEXPERIENCE\n### Engineer — Acme | Jan 2023 – Dec 2024\n- Built reports.';
  const revised = original + '\nSUMMARY\nReact developer focused on accessible interfaces.';
  const html = resumeHtml(revised, { original });
  assert.match(html, /rz-change/);
  assert.match(html, /<span class="rz-when">Jan 2023 – Dec 2024<\/span>/);
  assert.doesNotMatch(resumeHtml(original, { original }), /rz-change/);
});
