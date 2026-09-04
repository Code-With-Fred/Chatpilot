require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { chatWithClaude, isKeyConfigured } = require('./lib/anthropic');
const { chatRequestSchema, formatZodError } = require('./lib/validation');
const { asyncHandler } = require('./lib/asyncHandler');
const logger = require('./lib/logger');
const { checkEnv } = require('./lib/env');
const widgetRoutes = require('./routes/widget');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// System prompt for the sales-demo widget on the landing page itself.
// Per-business widgets (routes/widget.js) build their own prompt from
// whatever was entered for that client in the admin dashboard.
const SALES_SYSTEM_PROMPT = `You are ChatPilot, an AI sales agent for a service called ChatPilot. ChatPilot installs custom AI chat agents on business websites. Your job in this demo is to (1) impress the visitor by responding intelligently and warmly, (2) explain how their version of you would work for their specific business, (3) push them to book a call or buy.

Key facts:
- Pricing: ₦450,000 one-time setup + ₦80,000/month hosting and AI usage. For international clients paying in USD, that's $800 setup + $150/month.
- Payment methods: Paystack, Flutterwave, bank transfer for Nigerian clients. Stripe or wire transfer for international clients.
- Setup takes 3 days from when they pay
- Works on any website (WordPress, Wix, Squarespace, Shopify, Webflow, custom)
- Trained custom on each business: FAQs, services, hours, booking preferences
- Answers in any language, 24/7, unlimited conversations
- Can book appointments directly into their calendar
- Captures lead info and sends to their email or CRM
- 30-day refund guarantee on setup, cancel monthly anytime
- Best for: dentists, lawyers, real estate agents, med spas, coaches, agencies, e-commerce

Style: Be warm, direct, short (2-4 sentences max usually). Sound human, not corporate. Use "you" a lot. End most answers with a soft next-step nudge: "Want to see how I'd work for your business?" or "Ready to set yours up?" Never list more than 3 bullet points. When asked about price, give it confidently and frame as ROI.

If they ask things irrelevant to ChatPilot, gently steer back: "Great question — but I'm the demo agent. For your business, I'd be trained on exactly the questions your customers ask. Want me to set that up?"

If they show buying intent ("how do I sign up", "I want this", "yes"), say: "Amazing. Send 'codewithfred81@gmail.com' an email with your website URL and I'll have Fred reach out within 12 hours to kick off setup. Or click the Get ChatPilot button above."`;

// Only needed if deployed behind a reverse proxy (Render/Railway/Fly/nginx) —
// makes express-rate-limit and req.ip use X-Forwarded-For correctly instead
// of the proxy's own IP. Leave unset for a bare/direct deployment, where
// trusting that header would let clients spoof their own IP.
if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// contentSecurityPolicy is off because index.html/admin.html/widget.js all
// rely on inline <script>/<style>, which helmet's default CSP blocks without
// per-request nonces. The rest of helmet's defaults (X-Content-Type-Options,
// X-Frame-Options, etc.) still apply.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '150kb' }));
app.use(morgan('combined', { stream: { write: (line) => logger.info(line.trim()) } }));

// Only /public (widget.js, admin.html) is served statically — NOT the whole
// project root. That keeps server.js, routes/, lib/, and the database file
// (which holds real leads) from ever being reachable over HTTP.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    keyConfigured: isKeyConfigured(),
    adminConfigured: Boolean(process.env.ADMIN_KEY)
  });
});

// Rate limits: generous baseline on every /api route, tighter ones on the
// two endpoints that either cost money (AI calls) or invite spam (leads).
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const leadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api', apiLimiter);
app.use('/api/chat', chatLimiter);
app.use('/api/widget/:clientId/chat', chatLimiter);
app.use('/api/widget/:clientId/lead', leadLimiter);

// Landing-page sales demo
app.post(
  '/api/chat',
  asyncHandler(async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    try {
      const reply = await chatWithClaude(SALES_SYSTEM_PROMPT, parsed.data.messages);
      res.json({ reply });
    } catch (err) {
      if (err.code === 'NO_API_KEY') {
        return res.status(500).json({
          error: 'Server is missing ANTHROPIC_API_KEY. Add it to .env and restart the server.'
        });
      }
      logger.error('Chat proxy error', { message: err.message });
      res.status(502).json({ error: 'Upstream AI request failed' });
    }
  })
);

// Real product: per-business widgets + the dashboard that manages them
app.use('/api/widget', widgetRoutes);
app.use('/api/admin', adminRoutes);

// Anything under /api that didn't match above is a real 404, not the SPA fallback.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — catches anything asyncHandler forwards plus
// sync throws, logs it once with full detail, and never leaks internals
// to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled request error', { message: err.message, path: req.path, stack: err.stack });
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

function start() {
  checkEnv();

  const server = app.listen(PORT, () => {
    logger.info(`ChatPilot server running at http://localhost:${PORT}`);
    logger.info(`Admin dashboard: http://localhost:${PORT}/admin.html`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      require('./lib/db').close();
      process.exit(0);
    });
    // Don't hang forever if something's stuck draining connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Only bind a port when run directly (`node server.js` / `npm start`).
// Tests `require('./server')` to get the configured app without starting
// a real listener, and drive it with supertest instead.
if (require.main === module) {
  start();
}

module.exports = app;
