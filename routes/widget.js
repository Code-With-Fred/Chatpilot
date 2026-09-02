// Public API the embedded widget.js calls from any business's website.
// No auth here on purpose — a client's slug/id is not a secret, the same
// way an Intercom or Crisp "app id" isn't. It only unlocks that one
// business's own config/chat/lead endpoints.

const express = require('express');
const router = express.Router();

const { readDB, writeDB, id } = require('../lib/db');
const { buildClientSystemPrompt } = require('../lib/clientPrompt');
const { chatWithClaude } = require('../lib/anthropic');
const { notifyLead } = require('../lib/mailer');

function findClient(clientId) {
  const db = readDB();
  return db.clients.find((c) => c.id === clientId || c.slug === clientId);
}

router.get('/:clientId/config', (req, res) => {
  const client = findClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Unknown client' });

  res.json({
    businessName: client.businessName,
    greeting: client.greeting || 'Hi 👋 how can we help?',
    brandColor: client.brandColor || '#d4ff00'
  });
});

router.post('/:clientId/chat', async (req, res) => {
  const client = findClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Unknown client' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  if (messages.length > 40) {
    return res.status(400).json({ error: 'Conversation too long for this demo' });
  }

  try {
    const reply = await chatWithClaude(buildClientSystemPrompt(client), messages);
    res.json({ reply });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(500).json({ error: 'AI is not configured yet for this site.' });
    }
    console.error(`Widget chat error [${client.slug}]:`, err.message);
    res.status(502).json({ error: 'AI is temporarily unavailable' });
  }
});

router.post('/:clientId/lead', async (req, res) => {
  const client = findClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Unknown client' });

  const { name, email, phone, message } = req.body || {};
  if (!name || (!email && !phone)) {
    return res.status(400).json({ error: 'name and (email or phone) are required' });
  }

  const db = readDB();
  const lead = {
    id: id(),
    clientId: client.id,
    name: String(name).slice(0, 200),
    email: email ? String(email).slice(0, 200) : '',
    phone: phone ? String(phone).slice(0, 60) : '',
    message: message ? String(message).slice(0, 2000) : '',
    createdAt: new Date().toISOString()
  };
  db.leads.push(lead);
  writeDB(db);

  // Never let a flaky mail server break lead capture itself.
  notifyLead(client, lead).catch((err) =>
    console.error(`Lead email notify failed [${client.slug}]:`, err.message)
  );

  res.json({ ok: true });
});

module.exports = router;
