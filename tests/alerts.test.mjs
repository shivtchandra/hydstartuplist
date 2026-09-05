import test from 'node:test';import assert from 'node:assert/strict';
import {signAlert,verifyAlert} from '../lib/alert-tokens.js';
import {safeEvent} from '../lib/engagement.js';
test('alert links reject tampering and expiration',()=>{const token=signAlert('a'.repeat(64),'confirm','secret',100);assert.equal(verifyAlert(token,'secret',101).action,'confirm');assert.equal(verifyAlert(token,'wrong',101),null);assert.equal(verifyAlert(token,'secret',3*86400000),null);});
test('analytics strips private and unrecognized fields',()=>{const event=safeEvent({event:'landing',session:'12345678-1234-1234-1234-123456789abc',email:'private@a.com',q:'secret',lat:17});assert.equal(event.email,undefined);assert.equal(event.q,undefined);assert.equal(event.lat,undefined);assert.equal(safeEvent({event:'arbitrary'}),null);});
