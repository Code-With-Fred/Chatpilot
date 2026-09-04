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
4. **The backend** (`server.js` + `routes/` + `lib/`) — a production-shaped
   Express API: SQLite storage, schema-validated input, rate limiting,
   security headers, structured logging, centralized error handling, and an
   automated test suite.

## Project structure

```
Chatpilot/
├── index.html              # landing/sales page + demo widget
├── server.js                 # Express app: middleware, wiring, landing-page /api/chat
├── routes/
│   ├── widget.js               # public API used by every embedded widget
│   └── admin.js                  # protected API for onboarding clients / reading leads
├── lib/
│   ├── anthropic.js                # shared Claude API caller (timeout + clear errors)
│   ├── clientPrompt.js              # turns a client's info into their widget's system prompt
│   ├── db.js                          # SQLite store (better-sqlite3) for clients + leads
│   ├── validation.js                    # zod request schemas
│   ├── auth.js                            # constant-time admin-key comparison
│   ├── asyncHandler.js                      # forwards async route errors to Express
│   ├── logger.js                              # structured JSON logging
│   ├── env.js                                   # startup config validation/warnings
│   └── mailer.js                                  # optional lead-notification email
├── public/
│   ├── widget.js                                    # ← THE PRODUCT: embeddable script for client sites
│   └── admin.html                                     # onboarding + leads dashboard
├── test/                                                # automated tests (node:test + supertest)
├── data/chatpilot.db                                      # SQLite database (auto-created, git-ignored)
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
   `copy .env.example .env` and generate a new admin key with
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.)
3. Start the server:
   ```
   npm start
   ```
   (`npm run dev` restarts automatically on file changes.)
4. Open http://localhost:3000 — the landing page and its demo widget.
5. Open http://localhost:3000/admin.html — enter your `ADMIN_KEY` to get in.

## Run the tests

```
npm test
```

Runs on Node's built-in test runner (`node --test`) against an in-memory
SQLite database and a real (in-process) Express app via `supertest` — no
external services, no network calls, nothing to configure. 31 tests cover
the database layer, prompt building, validation schemas, admin auth, and
every widget/admin route including error paths (unknown client, missing
API key, malformed payloads, cascade delete).

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
  `https://api.anthropic.com/v1/messages`, with a 30s timeout so a hung
  upstream call can't hold a request open forever.
- The landing-page demo uses a fixed sales-persona prompt (`SALES_SYSTEM_PROMPT`
  in `server.js`).
- Each client's widget uses `lib/clientPrompt.js`, which turns their stored
  business info into a system prompt scoped to *only* what they told you —
  so the AI won't invent facts about their business.
- If the backend or the key is unavailable, both the landing page and the
  widget fall back gracefully (canned answers on the landing page; a plain
  "please leave your details" message on client widgets) instead of breaking.

## Production hardening

- **Storage**: SQLite via `better-sqlite3` (`lib/db.js`) — atomic, indexed,
  foreign-key cascade delete (deleting a client removes its leads). Replaced
  an earlier flat-JSON-file store that risked corruption under concurrent
  writes.
- **Validation**: every request body is checked against a `zod` schema
  (`lib/validation.js`) before it touches the database or the AI — bad input
  gets a clear 400, not a stack trace.
- **Rate limiting**: a generous baseline on all `/api/*` routes, tighter
  limits on the AI chat endpoints (cost-bearing) and lead capture (spam-prone).
- **Security headers**: `helmet` on every response (CSP is off because the
  landing/admin/widget pages use inline `<script>`/`<style>`; everything
  else — `X-Content-Type-Options`, `X-Frame-Options`, etc. — still applies).
- **Admin auth**: the `x-admin-key` check uses a constant-time comparison
  (`lib/auth.js`) instead of `===`, closing a minor timing side-channel.
- **Static file exposure**: only `index.html` and `public/` are servable —
  `server.js`, `routes/`, `lib/`, and the database file are never reachable
  over HTTP.
- **Logging**: structured JSON request/error logs (`morgan` piped through
  `lib/logger.js`) instead of scattered `console.log`.
- **Error handling**: a single centralized Express error handler catches
  anything thrown or rejected in a route, logs it with full detail, and
  always returns a clean generic message to the client.
- **Startup validation**: `lib/env.js` checks required config once at boot
  and logs every problem clearly, instead of each one surprising you
  individually at request time.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` drain in-flight requests and
  close the database cleanly before exiting.

## Deploying

This is a normal Node app — deploy anywhere that runs `npm install && npm start`:

- **Render / Railway / Fly.io**: point at this repo, set `ANTHROPIC_API_KEY`,
  `ADMIN_KEY` (and optionally the `SMTP_*` vars) as environment variables in
  the dashboard, and set `TRUST_PROXY=1` (these all run behind a reverse
  proxy, so rate limiting needs the real client IP from `X-Forwarded-For`).
- **A VPS**: `git clone`, `npm install`, set env vars, run with `pm2` or a
  systemd service, put nginx in front for TLS (leave `TRUST_PROXY` unset
  unless nginx sets `X-Forwarded-For` for you).

Whichever host you pick:
- **Never commit `.env`** — it's already git-ignored.
- Use a long random `ADMIN_KEY` (see the generator command above) — it's the
  only thing protecting your clients' data in `/admin.html`.
- `data/chatpilot.db` lives on disk, so make sure your host's filesystem
  persists across deploys/restarts (Render/Railway need a persistent disk
  mounted at `data/` for this — check their docs; otherwise every deploy
  wipes your clients and leads).

## Editing the sales pitch / pricing

The landing-page demo's knowledge (pricing, features, tone) lives in
`SALES_SYSTEM_PROMPT` inside `server.js`. Per-client widget behavior is
generated per business from what's entered in `/admin.html` (`PUT
/api/admin/clients/:id` updates any field — the dashboard's client table
is a natural place to wire in an edit button next).
