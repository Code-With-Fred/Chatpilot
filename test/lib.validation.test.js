const test = require('node:test');
const assert = require('node:assert/strict');
const { createClientSchema, leadSchema, chatRequestSchema } = require('../lib/validation');

test('createClientSchema requires businessName', () => {
  assert.equal(createClientSchema.safeParse({}).success, false);
});

test('createClientSchema fills in defaults', () => {
  const result = createClientSchema.safeParse({ businessName: 'Test Co' });
  assert.equal(result.success, true);
  assert.equal(result.data.brandColor, '#d4ff00');
  assert.equal(result.data.greeting, 'Hi 👋 how can we help?');
});

test('createClientSchema rejects a non-hex brandColor', () => {
  const result = createClientSchema.safeParse({ businessName: 'Test Co', brandColor: 'not-a-color' });
  assert.equal(result.success, false);
});

test('createClientSchema rejects an invalid contactEmail but allows blank', () => {
  assert.equal(createClientSchema.safeParse({ businessName: 'X', contactEmail: 'not-an-email' }).success, false);
  assert.equal(createClientSchema.safeParse({ businessName: 'X', contactEmail: '' }).success, true);
});

test('leadSchema requires an email or a phone', () => {
  assert.equal(leadSchema.safeParse({ name: 'Jane' }).success, false);
});

test('leadSchema accepts a phone-only lead', () => {
  assert.equal(leadSchema.safeParse({ name: 'Jane', phone: '12345' }).success, true);
});

test('chatRequestSchema rejects an empty messages array', () => {
  assert.equal(chatRequestSchema.safeParse({ messages: [] }).success, false);
});

test('chatRequestSchema rejects an invalid role', () => {
  const result = chatRequestSchema.safeParse({ messages: [{ role: 'system', content: 'hi' }] });
  assert.equal(result.success, false);
});
