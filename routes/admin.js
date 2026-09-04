// Admin API — onboard business clients, list their leads. Protected by a
// single shared secret (ADMIN_KEY) sent as the x-admin-key header. This is
// an MVP-level gate for a solo operator, not a multi-user auth system.

const express = require('express');
const router = express.Router();

const db = require('../lib/db');
const { safeCompare } = require('../lib/auth');
const { createClientSchema, updateClientSchema, formatZodError } = require('../lib/validation');
const { asyncHandler } = require('../lib/asyncHandler');

router.use((req, res, next) => {
  const configuredKey = process.env.ADMIN_KEY;
  if (!configuredKey) {
    return res.status(500).json({ error: 'ADMIN_KEY is not set on the server. Add it to .env and restart.' });
  }
  const provided = req.headers['x-admin-key'];
  if (typeof provided !== 'string' || !safeCompare(provided, configuredKey)) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  next();
});

router.get('/stats', (req, res) => {
  res.json(db.getStats());
});

router.get('/clients', (req, res) => {
  res.json({ clients: db.listClients() });
});

router.post('/clients', (req, res) => {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }
  const client = db.createClient(parsed.data);
  res.status(201).json({ client });
});

router.get('/clients/:id', (req, res) => {
  const client = db.getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ client });
});

router.put('/clients/:id', (req, res) => {
  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }
  const client = db.updateClient(req.params.id, parsed.data);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json({ client });
});

router.delete('/clients/:id', (req, res) => {
  const deleted = db.deleteClient(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.get('/leads', (req, res) => {
  const { clientId, limit, offset } = req.query;
  const leads = db.listLeads({
    clientId: clientId || undefined,
    limit: limit ? Math.min(Number(limit) || 200, 1000) : undefined,
    offset: offset ? Number(offset) || 0 : undefined
  });
  res.json({ leads });
});

router.get(
  '/leads/:clientId/export.csv',
  asyncHandler(async (req, res) => {
    const client = db.getClientById(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const leads = db.listLeads({ clientId: req.params.clientId, limit: 10000 });
    const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
    const header = 'Name,Email,Phone,Message,Date\n';
    const rows = leads
      .map((l) => [l.name, l.email, l.phone, l.message.replace(/\n/g, ' '), l.createdAt].map(escape).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${client.slug}.csv"`);
    res.send(header + rows);
  })
);

module.exports = router;
