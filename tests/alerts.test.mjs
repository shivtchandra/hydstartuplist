import test from 'node:test';
import assert from 'node:assert/strict';
import { signAlert, verifyAlert } from '../lib/alert-tokens.js';
import { safeEvent, sanitizePath } from '../lib/engagement.js';

test('alert links reject tampering and expiration', () => {
  const token = signAlert('a'.repeat(64), 'confirm', 'secret', 100);
  assert.equal(verifyAlert(token, 'secret', 101).action, 'confirm');
  assert.equal(verifyAlert(token, 'wrong', 101), null);
  assert.equal(verifyAlert(token, 'secret', 3 * 86400000), null);
});

test('analytics strips private and unrecognized fields', () => {
  const event = safeEvent({
    event: 'landing',
    session: '12345678-1234-1234-1234-123456789abc',
    email: 'private@a.com',
    q: 'secret',
    lat: 17,
  });
  assert.equal(event.email, undefined);
  assert.equal(event.q, undefined);
  assert.equal(event.lat, undefined);
  assert.equal(safeEvent({ event: 'arbitrary' }), null);
});

test('page paths are sanitized into anonymous buckets', () => {
  assert.equal(sanitizePath('/jobs/abc-123?q=secret'), '/jobs/:id');
  assert.equal(sanitizePath('/startups/foo-bar'), '/startups/:slug');
  assert.equal(sanitizePath('/radar'), '/radar');
  assert.equal(sanitizePath('/jobs?q=engineer'), '/jobs');
  assert.equal(sanitizePath('https://evil.com'), null);
  const page = safeEvent({
    event: 'page',
    session: '12345678-1234-1234-1234-123456789abc',
    path: '/startups/acme?ref=1',
  });
  assert.equal(page.path, '/startups/:slug');
  assert.equal(
    sanitizePath('/user/a@b.com'),
    null,
    'emails in path rejected'
  );
  assert.equal(sanitizePath('/x?email=a@b.com'), '/x', 'query stripped before store');
});

test("google login events keep method only", () => {
  const event = safeEvent({
    event: "google_login",
    session: "12345678-1234-1234-1234-123456789abc",
    loginMethod: "onetap",
    email: "private@a.com",
  });
  assert.equal(event.loginMethod, "onetap");
  assert.equal(event.email, undefined);
  assert.equal(
    safeEvent({
      event: "google_login",
      session: "12345678-1234-1234-1234-123456789abc",
      loginMethod: "evil",
    }).loginMethod,
    undefined
  );
});
