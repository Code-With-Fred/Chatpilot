const test = require('node:test');
const assert = require('node:assert/strict');
const { buildClientSystemPrompt } = require('../lib/clientPrompt');

test('prompt includes the business\'s actual info', () => {
  const prompt = buildClientSystemPrompt({
    businessName: 'Bright Smile Dental',
    aboutText: 'A friendly dental clinic',
    services: 'Cleanings',
    faqs: 'Q: Open Saturdays? A: No',
    hours: 'Mon-Fri',
    bookingInfo: 'Call us'
  });
  assert.match(prompt, /Bright Smile Dental/);
  assert.match(prompt, /A friendly dental clinic/);
  assert.match(prompt, /Cleanings/);
  assert.match(prompt, /Mon-Fri/);
});

test('missing fields fall back to "Not provided." instead of blank/undefined', () => {
  const prompt = buildClientSystemPrompt({ businessName: 'Minimal Co' });
  assert.match(prompt, /Minimal Co/);
  assert.match(prompt, /Not provided\./);
  assert.doesNotMatch(prompt, /undefined/);
});
