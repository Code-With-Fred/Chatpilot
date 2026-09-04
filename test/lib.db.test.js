const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const db = require('../lib/db');

test('createClient generates a slug and unique id', () => {
  const c1 = db.createClient({ businessName: 'Bright Smile Dental' });
  assert.equal(c1.slug, 'bright-smile-dental');
  assert.ok(c1.id);

  const c2 = db.createClient({ businessName: 'Bright Smile Dental' });
  assert.equal(c2.slug, 'bright-smile-dental-2');
  assert.notEqual(c1.id, c2.id);
});

test('getClientBySlugOrId resolves by either id or slug', () => {
  const created = db.createClient({ businessName: 'Acme Law' });
  assert.deepEqual(db.getClientBySlugOrId(created.id), created);
  assert.deepEqual(db.getClientBySlugOrId(created.slug), created);
  assert.equal(db.getClientBySlugOrId('does-not-exist'), null);
});

test('updateClient only touches the fields provided', () => {
  const created = db.createClient({ businessName: 'Foo Bar', hours: '9-5' });
  const updated = db.updateClient(created.id, { hours: '10-6' });
  assert.equal(updated.hours, '10-6');
  assert.equal(updated.businessName, 'Foo Bar');
});

test('updateClient on an unknown id returns null', () => {
  assert.equal(db.updateClient('nope', { hours: '10-6' }), null);
});

test('deleteClient cascades to that client\'s leads', () => {
  const created = db.createClient({ businessName: 'Cascade Test' });
  db.createLead({ clientId: created.id, name: 'Jane', email: 'jane@example.com' });
  assert.equal(db.listLeads({ clientId: created.id }).length, 1);

  assert.equal(db.deleteClient(created.id), true);
  assert.equal(db.listLeads({ clientId: created.id }).length, 0);
  assert.equal(db.deleteClient(created.id), false);
});

test('listLeads without a clientId returns leads across all clients', () => {
  const c = db.createClient({ businessName: 'All Leads Co' });
  db.createLead({ clientId: c.id, name: 'A', email: 'a@x.com' });
  db.createLead({ clientId: c.id, name: 'B', phone: '123' });
  const all = db.listLeads();
  assert.ok(all.length >= 2);
});

test('getStats counts clients and leads correctly', () => {
  const before = db.getStats();

  const c = db.createClient({ businessName: 'Stats Co' });
  db.createLead({ clientId: c.id, name: 'Stat Lead', email: 's@x.com' });

  const after = db.getStats();
  assert.equal(after.totalClients, before.totalClients + 1);
  assert.equal(after.totalLeads, before.totalLeads + 1);
  assert.ok(after.leadsLast7Days >= 1);
});
