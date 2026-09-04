const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
process.env.ADMIN_KEY = 'test-admin-key-1234567890';
delete process.env.ANTHROPIC_API_KEY;

const request = require('supertest');
const app = require('../server');

test('rejects a request with no admin key', async () => {
  const res = await request(app).get('/api/admin/clients');
  assert.equal(res.status, 401);
});

test('rejects a request with the wrong admin key', async () => {
  const res = await request(app).get('/api/admin/clients').set('x-admin-key', 'wrong');
  assert.equal(res.status, 401);
});

test('creates and lists a client with the correct admin key', async () => {
  const createRes = await request(app)
    .post('/api/admin/clients')
    .set('x-admin-key', process.env.ADMIN_KEY)
    .send({ businessName: 'Test Biz', contactEmail: 'a@b.com' });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.client.businessName, 'Test Biz');
  assert.equal(createRes.body.client.slug, 'test-biz');

  const listRes = await request(app).get('/api/admin/clients').set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.clients.some((c) => c.slug === 'test-biz'));
});

test('rejects an invalid client payload', async () => {
  const res = await request(app)
    .post('/api/admin/clients')
    .set('x-admin-key', process.env.ADMIN_KEY)
    .send({ brandColor: 'nope' }); // missing businessName too
  assert.equal(res.status, 400);
});

test('deleting a client cascades its leads', async () => {
  const createRes = await request(app)
    .post('/api/admin/clients')
    .set('x-admin-key', process.env.ADMIN_KEY)
    .send({ businessName: 'Delete Me' });
  const { id, slug } = createRes.body.client;

  await request(app).post(`/api/widget/${slug}/lead`).send({ name: 'Jane', email: 'jane@x.com' });

  const before = await request(app).get(`/api/admin/leads?clientId=${id}`).set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(before.body.leads.length, 1);

  const delRes = await request(app).delete(`/api/admin/clients/${id}`).set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(delRes.status, 200);

  const after = await request(app).get(`/api/admin/leads?clientId=${id}`).set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(after.body.leads.length, 0);
});

test('deleting an unknown client returns 404', async () => {
  const res = await request(app).delete('/api/admin/clients/does-not-exist').set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(res.status, 404);
});

test('stats reflects created clients and leads', async () => {
  const before = await request(app).get('/api/admin/stats').set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(before.status, 200);

  const createRes = await request(app)
    .post('/api/admin/clients')
    .set('x-admin-key', process.env.ADMIN_KEY)
    .send({ businessName: 'Stats Route Co' });
  await request(app).post(`/api/widget/${createRes.body.client.slug}/lead`).send({ name: 'Jane', email: 'jane@x.com' });

  const after = await request(app).get('/api/admin/stats').set('x-admin-key', process.env.ADMIN_KEY);
  assert.equal(after.body.totalClients, before.body.totalClients + 1);
  assert.equal(after.body.totalLeads, before.body.totalLeads + 1);
});

test('editing a client via PUT updates only the given fields', async () => {
  const createRes = await request(app)
    .post('/api/admin/clients')
    .set('x-admin-key', process.env.ADMIN_KEY)
    .send({ businessName: 'Edit Me Co', hours: '9-5' });
  const { id } = createRes.body.client;

  const putRes = await request(app)
    .put(`/api/admin/clients/${id}`)
    .set('x-admin-key', process.env.ADMIN_KEY)
    .send({ hours: '10-6' });
  assert.equal(putRes.status, 200);
  assert.equal(putRes.body.client.hours, '10-6');
  assert.equal(putRes.body.client.businessName, 'Edit Me Co');
});
