// SQLite-backed store for clients and leads, via better-sqlite3 (synchronous,
// no ORM, prepared statements). Replaces the earlier flat-JSON-file store,
// which had a real risk of corruption/lost writes if two requests wrote to
// it at the same moment — SQLite gives us atomic, indexed, transactional
// writes instead.
//
// DB_PATH can be overridden (tests use ':memory:') — see .env.example.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'chatpilot.db');
const DB_PATH = process.env.DB_PATH || DEFAULT_DB_PATH;

if (DB_PATH !== ':memory:' && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    about_text TEXT NOT NULL DEFAULT '',
    services TEXT NOT NULL DEFAULT '',
    faqs TEXT NOT NULL DEFAULT '',
    hours TEXT NOT NULL DEFAULT '',
    booking_info TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '',
    brand_color TEXT NOT NULL DEFAULT '#d4ff00',
    greeting TEXT NOT NULL DEFAULT 'Hi 👋 how can we help?',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
`);

function id() {
  return crypto.randomBytes(8).toString('hex');
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function rowToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.business_name,
    aboutText: row.about_text,
    services: row.services,
    faqs: row.faqs,
    hours: row.hours,
    bookingInfo: row.booking_info,
    contactEmail: row.contact_email,
    brandColor: row.brand_color,
    greeting: row.greeting,
    createdAt: row.created_at
  };
}

function rowToLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    createdAt: row.created_at
  };
}

const stmts = {
  insertClient: db.prepare(`
    INSERT INTO clients
      (id, slug, business_name, about_text, services, faqs, hours, booking_info, contact_email, brand_color, greeting, created_at)
    VALUES
      (@id, @slug, @businessName, @aboutText, @services, @faqs, @hours, @bookingInfo, @contactEmail, @brandColor, @greeting, @createdAt)
  `),
  getClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  getClientBySlug: db.prepare('SELECT * FROM clients WHERE slug = ?'),
  listClients: db.prepare('SELECT * FROM clients ORDER BY created_at DESC'),
  slugExists: db.prepare('SELECT 1 FROM clients WHERE slug = ?'),
  deleteClient: db.prepare('DELETE FROM clients WHERE id = ?'),
  insertLead: db.prepare(`
    INSERT INTO leads (id, client_id, name, email, phone, message, created_at)
    VALUES (@id, @clientId, @name, @email, @phone, @message, @createdAt)
  `),
  listLeadsAll: db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?'),
  listLeadsByClient: db.prepare('SELECT * FROM leads WHERE client_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'),
  countClients: db.prepare('SELECT COUNT(*) AS n FROM clients'),
  countLeads: db.prepare('SELECT COUNT(*) AS n FROM leads'),
  countLeadsSince: db.prepare('SELECT COUNT(*) AS n FROM leads WHERE created_at >= ?')
};

const UPDATABLE_FIELDS = [
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
const FIELD_TO_COLUMN = {
  businessName: 'business_name',
  aboutText: 'about_text',
  services: 'services',
  faqs: 'faqs',
  hours: 'hours',
  bookingInfo: 'booking_info',
  contactEmail: 'contact_email',
  brandColor: 'brand_color',
  greeting: 'greeting'
};

function uniqueSlug(base) {
  let slug = base || 'client';
  let n = 1;
  while (stmts.slugExists.get(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function createClient(data) {
  const client = {
    id: id(),
    slug: uniqueSlug(slugify(data.businessName) || 'client'),
    businessName: data.businessName,
    aboutText: data.aboutText || '',
    services: data.services || '',
    faqs: data.faqs || '',
    hours: data.hours || '',
    bookingInfo: data.bookingInfo || '',
    contactEmail: data.contactEmail || '',
    brandColor: data.brandColor || '#d4ff00',
    greeting: data.greeting || 'Hi 👋 how can we help?',
    createdAt: new Date().toISOString()
  };
  stmts.insertClient.run(client);
  return client;
}

function getClientById(clientId) {
  return rowToClient(stmts.getClientById.get(clientId));
}

// Widget URLs use a client's slug; the admin dashboard uses its id. Accept either.
function getClientBySlugOrId(value) {
  return rowToClient(stmts.getClientById.get(value) || stmts.getClientBySlug.get(value));
}

function listClients() {
  return stmts.listClients.all().map(rowToClient);
}

function updateClient(clientId, fields) {
  const existing = getClientById(clientId);
  if (!existing) return null;

  const sets = [];
  const params = { id: clientId };
  for (const key of UPDATABLE_FIELDS) {
    if (fields[key] !== undefined) {
      sets.push(`${FIELD_TO_COLUMN[key]} = @${key}`);
      params[key] = fields[key];
    }
  }
  if (sets.length === 0) return existing;

  db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getClientById(clientId);
}

// Leads are removed automatically via ON DELETE CASCADE.
function deleteClient(clientId) {
  return stmts.deleteClient.run(clientId).changes > 0;
}

function createLead(data) {
  const lead = {
    id: id(),
    clientId: data.clientId,
    name: data.name,
    email: data.email || '',
    phone: data.phone || '',
    message: data.message || '',
    createdAt: new Date().toISOString()
  };
  stmts.insertLead.run(lead);
  return lead;
}

function listLeads({ clientId, limit = 200, offset = 0 } = {}) {
  const rows = clientId
    ? stmts.listLeadsByClient.all(clientId, limit, offset)
    : stmts.listLeadsAll.all(limit, offset);
  return rows.map(rowToLead);
}

function getStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    totalClients: stmts.countClients.get().n,
    totalLeads: stmts.countLeads.get().n,
    leadsLast7Days: stmts.countLeadsSince.get(sevenDaysAgo).n
  };
}

function close() {
  db.close();
}

module.exports = {
  id,
  slugify,
  createClient,
  getClientById,
  getClientBySlugOrId,
  listClients,
  updateClient,
  deleteClient,
  createLead,
  listLeads,
  getStats,
  close,
  DB_PATH
};
