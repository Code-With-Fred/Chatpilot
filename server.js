require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { chatWithClaude } = require('./lib/anthropic');
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

app.use(cors());
app.use(express.json({ limit: '150kb' }));

// Only /public (widget.js, admin.html) is served statically — NOT the whole
// project root. That keeps server.js, routes/, lib/, and data/db.json
// (which holds real leads) from ever being reachable over HTTP.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    adminConfigured: Boolean(process.env.ADMIN_KEY)
  });
});

// Landing-page sales demo
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const reply = await chatWithClaude(SALES_SYSTEM_PROMPT, messages);
    res.json({ reply });
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(500).json({
        error: 'Server is missing ANTHROPIC_API_KEY. Add it to .env and restart the server.'
      });
    }
    console.error('Chat proxy error:', err.message);
    res.status(502).json({ error: 'Upstream AI request failed' });
  }
});

// Real product: per-business widgets + the dashboard that manages them
app.use('/api/widget', widgetRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`ChatPilot server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard:            http://localhost:${PORT}/admin.html`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY is not set — all chat endpoints will error until it is configured in .env');
  }
  if (!process.env.ADMIN_KEY) {
    console.warn('⚠️  ADMIN_KEY is not set — the admin dashboard is disabled until it is configured in .env');
  }
});
