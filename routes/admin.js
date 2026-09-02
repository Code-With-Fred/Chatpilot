// Admin API — onboard business clients, list their leads. Protected by a
// single shared secret (ADMIN_KEY) sent as the x-admin-key header. This is
// an MVP-level gate for a solo operator, not a multi-user auth system.

const express = require('express');
const router = express.Router();

const { readDB, writeDB, id, slugify } = require('../lib/db');

router.use((req, res, next) => {
  const configuredKey = process.env.ADMIN_KEY;
  if (!configuredKey) {
    return res.status(500).json({ error: 'ADMIN_KEY is not set on the server. Add it to .env and restart.' });
  }
  if (req.headers['x-admin-key'] !== configuredKey) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  next();
});

const EDITABLE_FIELDS = [
  'businessName',
  'aboutText',
  'services',
  'faqs',
  'hours',
  'bookingInfo',
  'contactEmail',
  'brandColor',
  'greeting'
];

router.get('/clients', (req, res) => {
  const db = readDB();
  res.json({ clients: db.clients });
});

router.post('/clients', (req, res) => {
  const body = req.body || {};
  if (!body.businessName || !String(body.businessName).trim()) {
    return res.status(400).json({ error: 'businessName is required' });
  }

  const db = readDB();
  const baseSlug = slugify(body.businessName) || 'client';
  let slug = baseSlug;
  let n = 1;
  while (db.clients.some((c) => c.slug === slug)) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const client = { id: id(), slug, createdAt: new Date().toISOString() };
  for (const field of EDITABLE_FIELDS) {
    client[field] = body[field] || '';
  }
  if (!client.brandColor) client.brandColor = '#d4ff00';
  if (!client.greeting) client.greeting = 'Hi 👋 how can we help?';

  db.clients.push(client);
  writeDB(db);
  res.status(201).json({ client });
});

router.get('/clients/:id', (req, res) => {
  const db = readDB();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ client });
});

router.put('/clients/:id', (req, res) => {
  const db = readDB();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const body = req.body || {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) client[field] = body[field];
  }
  writeDB(db);
  res.json({ client });
});

router.delete('/clients/:id', (req, res) => {
  const db = readDB();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => c.id !== req.params.id);
  db.leads = db.leads.filter((l) => l.clientId !== req.params.id);
  writeDB(db);
  if (db.clients.length === before) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.get('/leads', (req, res) => {
  const db = readDB();
  const { clientId } = req.query;
  const leads = clientId ? db.leads.filter((l) => l.clientId === clientId) : db.leads;
  leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ leads });
});

router.get('/leads/:clientId/export.csv', (req, res) => {
  const db = readDB();
  const leads = db.leads.filter((l) => l.clientId === req.params.clientId);

  const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  const header = 'Name,Email,Phone,Message,Date\n';
  const rows = leads
    .map((l) => [l.name, l.email, l.phone, l.message.replace(/\n/g, ' '), l.createdAt].map(escape).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${req.params.clientId}.csv"`);
  res.send(header + rows);
});

module.exports = router;
