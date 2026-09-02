# ChatPilot

ChatPilot is an AI chat-widget service sold to business owners. This repo is the
**whole product**, not just marketing:

1. **The landing page** (`index.html`) — sells ChatPilot, with a live AI demo widget.
2. **The actual product** (`public/widget.js`) — an embeddable chat widget any
   business drops on their own website with one `<script>` tag. It answers
   questions about *that* business and captures leads.
3. **The admin dashboard** (`public/admin.html`) — where you (the operator)
   onboard a new business client, get their embed snippet, and see the leads
   their widget has captured.
4. **The backend** (`server.js` + `routes/` + `lib/`) — holds the Claude API
   key server-side, serves the landing page, powers every client's widget,
   and stores clients/leads.

## Project structure

```
Chatpilot/
├── index.html            # landing/sales page + demo widget
├── server.js              # Express app: wiring + landing-page /api/chat
├── routes/
│   ├── widget.js           # public API used by every embedded widget
│   └── admin.js             # protected API for onboarding clients / reading leads
├── lib/
│   ├── anthropic.js          # shared Claude API caller
│   ├── clientPrompt.js       # turns a client's info into their widget's system prompt
│   ├── db.js                  # tiny file-based JSON store
│   └── mailer.js               # optional lead-notification email
├── public/
│   ├── widget.js               # ← THE PRODUCT: embeddable script for client sites
│   └── admin.html               # onboarding + leads dashboard
├── data/db.json                  # clients + leads (auto-created, git-ignored)
├── package.json
├── .env.example
└── .gitignore
```

## Run it locally

1. Install dependencies:
   ```
   npm install
   ```
2. `.env` already exists locally with a generated `ADMIN_KEY`. Open it and
   paste in your real Anthropic API key
   (get one at https://console.anthropic.com/) in place of
   `your_anthropic_api_key_here`. (If you ever need to start fresh:
   `copy .env.example .env` and generate a new key with
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.)
3. Start the server:
   ```
   npm start
   ```
4. Open http://localhost:3000 — the landing page and its demo widget.
5. Open http://localhost:3000/admin.html — enter your `ADMIN_KEY` to get in.

## Selling this to a business (the actual workflow)

1. A client pays / signs up. Go to `/admin.html`.
2. Fill in **Add a new business**: name, about text, services, FAQs, hours,
   booking info, brand color, greeting, and the email their leads should go to.
3. Click **Create client** — a table row appears with their **embed snippet**:
   ```html
   <script src="https://your-domain.com/widget.js" data-client="their-slug"></script>
   ```
4. Send that one line to the client (or install it for them). Paste it right
   before `</body>` on their site — WordPress, Wix, Squarespace, Shopify,
   Webflow, or a custom site all work the same way.
5. Their widget appears as a chat bubble in the bottom-right of their site. It
   answers using only what you entered for them, and has a **"Leave your
   details"** button that captures name + email/phone + message as a lead.
6. Every lead lands in the **Leads** table in `/admin.html` (filterable per
   client, exportable as CSV via `/api/admin/leads/:clientId/export.csv`), and
   — if you configure SMTP in `.env` — is also emailed straight to the client.

## How the chat works, end to end

- The browser (landing page demo *and* every embedded widget) never talks to
  Anthropic directly — it only ever calls your own backend.
- `lib/anthropic.js` is the one place holding `ANTHROPIC_API_KEY` and calling
  `https://api.anthropic.com/v1/messages`.
- The landing-page demo uses a fixed sales-persona prompt (`SALES_SYSTEM_PROMPT`
  in `server.js`).
- Each client's widget uses `lib/clientPrompt.js`, which turns their stored
  business info into a system prompt scoped to *only* what they told you —
  so the AI won't invent facts about their business.
- If the backend or the key is unavailable, both the landing page and the
  widget fall back gracefully (canned answers on the landing page; a plain
  "please leave your details" message on client widgets) instead of breaking.

## Data storage

`data/db.json` is a small JSON file holding `clients` and `leads`. It's
created automatically on first run and is git-ignored (it holds real business
and lead data — never commit it). This is intentionally simple for a
solo-operator MVP; swap in a real database later if you outgrow it.

## Deploying

This is a normal Node app — deploy anywhere that runs `npm install && npm start`:

- **Render / Railway / Fly.io**: point at this repo, set `ANTHROPIC_API_KEY`,
  `ADMIN_KEY` (and optionally the `SMTP_*` vars) as environment variables in
  the dashboard, done.
- **A VPS**: `git clone`, `npm install`, set env vars, run with `pm2` or a
  systemd service, put nginx in front for TLS.

Whichever host you pick:
- **Never commit `.env`** — it's already git-ignored.
- Use a long random `ADMIN_KEY` (see the generator command above) — it's the
  only thing protecting your clients' data in `/admin.html`.
- `data/db.json` lives on disk, so make sure your host's filesystem persists
  across deploys/restarts (or move to a real database once you have real
  clients depending on it).

## Editing the sales pitch / pricing

The landing-page demo's knowledge (pricing, features, tone) lives in
`SALES_SYSTEM_PROMPT` inside `server.js`. Per-client widget behavior is
generated per business from what's entered in `/admin.html` — edit a client's
info there (via the API — a "Save" button on the client list is a natural
next addition) to change what their widget says.
