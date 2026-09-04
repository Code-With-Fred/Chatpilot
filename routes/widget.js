// Public API the embedded widget.js calls from any business's website.
// No auth here on purpose — a client's slug/id is not a secret, the same
// way an Intercom or Crisp "app id" isn't. It only unlocks that one
// business's own config/chat/lead endpoints.

const express = require('express');
const router = express.Router();

const db = require('../lib/db');
const { buildClientSystemPrompt } = require('../lib/clientPrompt');
const { chatWithClaude } = require('../lib/anthropic');
const { notifyLead } = require('../lib/mailer');
const { chatRequestSchema, leadSchema, formatZodError } = require('../lib/validation');
const { asyncHandler } = require('../lib/asyncHandler');
const logger = require('../lib/logger');

function loadClient(req, res, next) {
  const client = db.getClientBySlugOrId(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Unknown client' });
  req.client = client;
  next();
}

router.get('/:clientId/config', loadClient, (req, res) => {
  const { client } = req;
  res.json({
    businessName: client.businessName,
    greeting: client.greeting || 'Hi 👋 how can we help?',
    brandColor: client.brandColor || '#d4ff00'
  });
});

router.post(
  '/:clientId/chat',
  loadClient,
  asyncHandler(async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    try {
      const reply = await chatWithClaude(buildClientSystemPrompt(req.client), parsed.data.messages);
      res.json({ reply });
    } catch (err) {
      if (err.code === 'NO_API_KEY') {
        return res.status(500).json({ error: 'AI is not configured yet for this site.' });
      }
      logger.error('Widget chat error', { client: req.client.slug, message: err.message });
      res.status(502).json({ error: 'AI is temporarily unavailable' });
    }
  })
);

router.post(
  '/:clientId/lead',
  loadClient,
  asyncHandler(async (req, res) => {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const lead = db.createLead({ clientId: req.client.id, ...parsed.data });

    // Never let a flaky mail server break lead capture itself.
    notifyLead(req.client, lead).catch((err) =>
      logger.error('Lead email notify failed', { client: req.client.slug, message: err.message })
    );

    res.json({ ok: true });
  })
);

module.exports = router;
