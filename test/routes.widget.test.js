const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
process.env.ADMIN_KEY = 'test-admin-key-1234567890';
delete process.env.ANTHROPIC_API_KEY; // exercises the "not configured" path without hitting the network

const request = require('supertest');
const app = require('../server');
const db = require('../lib/db');

test('unknown client returns 404 on config, chat, and lead', async () => {
  const cfg = await request(app).get('/api/widget/does-not-exist/config');
  assert.equal(cfg.status, 404);

  const chat = await request(app)
    .post('/api/widget/does-not-exist/chat')
    .send({ messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(chat.status, 404);

  const lead = await request(app).post('/api/widget/does-not-exist/lead').send({ name: 'Jane', email: 'jane@x.com' });
  assert.equal(lead.status, 404);
});

test('config exposes only the public fields for a real client', async () => {
  const client = db.createClient({ businessName: 'Widget Co', greeting: 'Yo!', brandColor: '#123456' });
  const res = await request(app).get(`/api/widget/${client.slug}/config`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { businessName: 'Widget Co', greeting: 'Yo!', brandColor: '#123456' });
});

test('chat without a configured API key fails clearly instead of crashing', async () => {
  const client = db.createClient({ businessName: 'No Key Co' });
  const res = await request(app)
    .post(`/api/widget/${client.slug}/chat`)
    .send({ messages: [{ role: 'user', content: 'What are your hours?' }] });
  assert.equal(res.status, 500);
  assert.match(res.body.error, /not configured/i);
});

test('chat rejects a malformed message payload', async () => {
  const client = db.createClient({ businessName: 'Bad Payload Co' });
  const res = await request(app)
    .post(`/api/widget/${client.slug}/chat`)
    .send({ messages: [{ role: 'system', content: 'hi' }] });
  assert.equal(res.status, 400);
});

test('lead capture requires a name and (email or phone)', async () => {
  const client = db.createClient({ businessName: 'Lead Co' });

  const missing = await request(app).post(`/api/widget/${client.slug}/lead`).send({ name: 'Jane' });
  assert.equal(missing.status, 400);

  const ok = await request(app).post(`/api/widget/${client.slug}/lead`).send({ name: 'Jane', phone: '555-1234' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.ok, true);
});
