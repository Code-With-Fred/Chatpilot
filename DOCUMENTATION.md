# ChatPilot — Documentation

This document explains how ChatPilot works, in two parts:

- **Part 1 — Running the Business.** Plain English. No code. For onboarding
  clients, reading leads, and everyday operation.
- **Part 2 — Technical Reference.** For a developer working on the code —
  architecture, files, the database, and every API endpoint.

You don't need Part 2 to run ChatPilot day to day. Read Part 1 first.

---

# Part 1 — Running the Business

## What ChatPilot actually is

ChatPilot sells one thing: **a chat bubble that lives on a business's
website and answers their customers' questions automatically, 24/7.**

Think of it like hiring a receptionist who never sleeps, never takes a day
off, and already knows everything about the business — their hours, their
prices, their services — because you told it all of that ahead of time.

There are three things that make this work, and they all live in this one
project:

| Piece | What it is | Who uses it |
|---|---|---|
| **The landing page** | The website that sells ChatPilot | Potential customers, browsing |
| **The widget** | The actual chat bubble that goes on a client's site | Their website visitors |
| **The admin dashboard** | Where you manage everything | You |

## The three pieces, explained like you've never seen the code

### 1. The landing page

This is `index.html` — the page people land on when they hear about
ChatPilot. It explains what ChatPilot does, shows pricing, and has a **live
demo chat bubble** so a visitor can try talking to "ChatPilot" before buying
it. That demo is just ChatPilot selling itself, using itself.

### 2. The widget — the actual product

This is the one thing you're really selling: a small chat bubble that
appears in the bottom-right corner of a business's website.

You give each client **one line of code** to paste into their site:

```html
<script src="https://your-domain.com/widget.js" data-client="their-business-slug"></script>
```

That's it. That single line does everything:

- Draws the chat bubble
- Loads that business's name, greeting, and brand color
- Lets visitors chat with an AI that only knows about *that* business
- Shows a **"Leave your details"** button so visitors can hand over their
  name and contact info even if they don't want to type a full
  conversation

A visitor on the client's site never knows this bubble came from
"ChatPilot" behind the scenes (aside from a small, unobtrusive "Powered by
ChatPilot" credit at the bottom of the chat panel) — it looks and talks
like it belongs to that business.

### 3. The admin dashboard — your control panel

This is `/admin.html`. It's a single password-protected page (your
**admin key**) where you do everything:

- **Add a new business** — fill in a form with their name, services, FAQs,
  hours, and how people should book with them
- Get their **embed snippet** — the one line of code to send them
- **Preview** their widget — see and test exactly what their visitors will
  see, before they ever install it
- **Edit** a client's info any time their hours, prices, or FAQs change
- **See their leads** — every name/email/phone someone left in their chat
  widget, with a CSV download
- **See stats** — total clients, total leads, leads in the last 7 days

## Onboarding a new client, step by step

1. A business signs up and pays.
2. Open `/admin.html` and log in with your admin key.
3. Fill in the **"Add a new business"** form:
   - **Business name** — required, everything else is optional but the
     more you fill in, the smarter their widget will sound
   - **About the business** — a couple of sentences on what they do
   - **Services / products** — what they offer
   - **FAQs** — common questions and answers, one per line is fine
   - **Hours** — when they're open
   - **Booking info** — how someone books an appointment (a phone number,
     a link, "just ask in chat," etc.)
   - **Contact email** — where you want their leads emailed (if you've set
     up email — see below)
   - **Brand color** — matches the chat bubble to their site
   - **Greeting** — the first message visitors see
4. Click **Create client**. A row appears in the **Clients & embed
   snippets** table with their embed snippet already written out.
5. Click **Preview** to open a demo page and try the widget yourself
   exactly as their visitors will see it.
6. Click **Copy snippet**, and send that one line to the client (or paste
   it into their site yourself if you're doing the install). It goes
   anywhere before the closing `</body>` tag — works on WordPress, Wix,
   Squarespace, Shopify, Webflow, or a hand-built site, no differently.
7. Done. Their widget is live.

## What happens when one of their visitors uses the widget

1. The chat bubble appears in the corner of the site.
2. After a few seconds, if they haven't clicked it, a small message bubble
   pops up on its own inviting them to chat (this is standard behavior for
   chat widgets — it nudges engagement instead of waiting silently).
3. If they type a question, the AI answers using **only** what you entered
   for that business — it won't invent prices or policies you didn't give
   it. If it doesn't know something, it tells them to leave their details
   instead of guessing.
4. If they click **"Leave your details,"** they fill in name + email/phone
   + a short message, and that's captured as a **lead** immediately —
   whether or not they ever typed a chat message.

## Where leads end up

Every lead shows up in two places:

1. **The admin dashboard**, under **Leads** — filterable by client,
   downloadable as a CSV file (open it in Excel/Google Sheets).
2. **The client's own inbox**, automatically — but only if you've set up
   email sending (see "Setting up lead emails" below). If you haven't,
   leads still land safely in the dashboard; they just don't get emailed
   out.

## Editing a client's info later

Business hours change, prices change, new FAQs come up. In the **Clients**
table, click **Edit** on any client — their existing info loads back into
the form at the top of the page, make your changes, click **Save changes**.
Their live widget starts using the new info on the very next message; no
reinstall needed on their site.

## Understanding the stats

At the top of the dashboard:

- **Total clients** — how many businesses are using ChatPilot right now
- **Total leads captured** — across every client, all time
- **Leads in the last 7 days** — a quick pulse check on recent activity

## Setting up lead emails (optional)

By default, leads only show up in your dashboard. If you want them
**automatically emailed** to each client the moment they come in, you need
to give ChatPilot an email account to send from. This is a one-time setup
in the `.env` file:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=you@yourdomain.com
SMTP_PASS=your-email-account-password-or-app-key
LEAD_NOTIFY_FROM=you@yourdomain.com
```

Most email providers (Gmail, Zoho, Outlook, your domain host) can give you
these SMTP details — search "[your provider] SMTP settings." Once set and
the server is restarted, every lead is emailed to that client's
**contact email** automatically, in addition to showing up in your
dashboard.

## Troubleshooting

**"The chat isn't answering, it just says something went wrong."**
The AI needs a Claude API key to work. Open `.env`, check that
`ANTHROPIC_API_KEY` is a real key (not the placeholder text) from
[console.anthropic.com](https://console.anthropic.com/), then restart the
server.

**"I forgot my admin key / lost access to the dashboard."**
It's in your `.env` file under `ADMIN_KEY`. You (or your developer) can
open that file directly to see it, or set a new one and restart.

**"A client says their leads aren't emailing to them."**
Check two things: their **contact email** is filled in for that client in
the dashboard, and the `SMTP_*` settings are filled in in `.env` (see
above). Without both, leads still land safely in the dashboard — they just
won't auto-email.

**"I deleted a client by mistake."**
Deleting a client also deletes their leads — there's no undo. The delete
button always asks you to confirm first for exactly this reason.

## A short glossary

- **Client** — a business paying for ChatPilot; one row in your dashboard.
- **Slug** — the short web-safe id ChatPilot generates from a business's
  name (e.g. "Bright Smile Dental" → `bright-smile-dental`). It's what
  goes in their embed snippet.
- **Embed snippet** — the one line of `<script>` code a client pastes into
  their site.
- **Lead** — a name + contact info someone left in a client's widget.
- **Admin key** — your password into `/admin.html`.

---

# Part 2 — Technical Reference

## Architecture, in one picture

```
                     ┌────────────────────┐
                     │   Landing page      │  index.html
                     │  (sells ChatPilot)  │  demo widget → /api/chat
                     └─────────┬───────────┘
                               │
   ┌───────────────────────────┼────────────────────────────┐
   │                            │                             │
   │   Client's own website     │      /admin.html            │
   │   ┌──────────────────┐     │   (you, the operator)       │
   │   │  widget.js        │    │                              │
   │   │  (Shadow DOM      │    │                              │
   │   │   chat bubble)    │    │                              │
   │   └─────────┬─────────┘    │                              │
   │             │              │                              │
   └─────────────┼──────────────┼──────────────────────────────┘
                 │              │
                 ▼              ▼
        ┌─────────────────────────────────┐
        │           server.js              │   Express app
        │  ┌───────────┐   ┌────────────┐  │
        │  │ /api/widget│   │ /api/admin │  │
        │  │  (public)  │   │ (key-gated)│  │
        │  └─────┬──────┘   └─────┬──────┘  │
        └────────┼────────────────┼─────────┘
                 │                │
        ┌────────▼───────┐  ┌─────▼──────────┐
        │  Anthropic API  │  │  SQLite database │
        │  (Claude)       │  │  clients + leads  │
        └─────────────────┘  └───────────────────┘
```

Nothing in a browser (not the landing page, not a client's widget, not the
admin dashboard) ever talks to Anthropic directly. Everything goes through
`server.js`, which is the only place holding the Anthropic API key.

## Project layout

```
Chatpilot/
├── index.html              # landing/sales page + demo widget
├── server.js                 # Express app: middleware, routing, landing-page /api/chat
├── routes/
│   ├── widget.js               # public API used by every embedded widget
│   └── admin.js                  # protected API for onboarding clients / reading leads
├── lib/
│   ├── anthropic.js                # calls Claude; 30s timeout; clear "no key" errors
│   ├── clientPrompt.js              # turns a client's stored info into their system prompt
│   ├── db.js                          # SQLite access layer (better-sqlite3)
│   ├── validation.js                    # zod request schemas
│   ├── auth.js                            # constant-time admin-key comparison
│   ├── asyncHandler.js                      # forwards async route errors to Express
│   ├── logger.js                              # structured JSON logging
│   ├── env.js                                   # startup config checks
│   └── mailer.js                                  # optional lead-notification email
├── public/
│   ├── widget.js                                    # the embeddable widget (THE product)
│   ├── admin.html                                     # the dashboard
│   └── preview.html                                     # test-drive a client's widget
├── test/                                                  # node:test + supertest, 34 tests
├── data/chatpilot.db                                        # SQLite file (git-ignored)
├── package.json
├── .env.example
└── .gitignore
```

## The database

Two tables, in `data/chatpilot.db` (SQLite, via `better-sqlite3`):

**`clients`**

| Column | Meaning |
|---|---|
| `id` | Random hex id, e.g. `946f305f52480f76` |
| `slug` | URL-safe name, e.g. `bright-smile-dental`, used in the embed snippet |
| `business_name` | Display name |
| `about_text`, `services`, `faqs`, `hours`, `booking_info` | Everything the widget's AI is allowed to know |
| `contact_email` | Where lead notification emails go |
| `brand_color` | Hex color, styles the widget |
| `greeting` | First message shown in the widget |
| `created_at` | ISO timestamp |

**`leads`**

| Column | Meaning |
|---|---|
| `id` | Random hex id |
| `client_id` | Foreign key → `clients.id`, `ON DELETE CASCADE` |
| `name`, `email`, `phone`, `message` | Whatever the visitor entered |
| `created_at` | ISO timestamp |

`ON DELETE CASCADE` means deleting a client automatically deletes their
leads at the database level — `db.deleteClient()` doesn't need to (and
doesn't) manually clean up leads itself.

`lib/db.js` wraps this in plain functions (`createClient`, `getClientById`,
`getClientBySlugOrId`, `listClients`, `updateClient`, `deleteClient`,
`createLead`, `listLeads`, `getStats`) — nothing outside that file writes
raw SQL.

## How a client's AI prompt is built

`lib/clientPrompt.js` takes a client row and produces a system prompt like:

```
You are the AI assistant for Bright Smile Dental, installed on their
website by ChatPilot.

About the business:
A friendly dental clinic.

Services / products:
Cleanings, whitening, checkups
...

Rules:
- Only answer using the information above. Never invent facts...
- If you don't know something, say so honestly and point the visitor to
  "Leave your details"...
```

This is why a client's widget won't make up prices or policies: the model
is explicitly told its knowledge is limited to what's in that prompt, and
to defer to the lead form for anything else.

## API reference

All request bodies are JSON. All responses are JSON except the CSV export.

### Public — used by the landing page

**`POST /api/chat`**
The landing page's own sales demo (fixed persona, not tied to any client).
Body: `{ messages: [{ role: "user"|"assistant", content: string }] }`
(1–40 messages). Returns `{ reply: string }` or `{ error: string }`.

### Public — used by every embedded widget (`/api/widget/:clientId/...`)

`:clientId` accepts either a client's `slug` or its `id`.

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/config` | GET | — | `{ businessName, greeting, brandColor }` |
| `/chat` | POST | `{ messages: [...] }` | `{ reply }` |
| `/lead` | POST | `{ name, email?, phone?, message? }` (email or phone required) | `{ ok: true }` |

Unknown `:clientId` → `404`. No auth — a slug isn't a secret, the same way
an Intercom "app id" isn't; it only unlocks that one client's own data.

### Protected — the admin dashboard (`/api/admin/...`)

Every request needs an `x-admin-key` header matching `ADMIN_KEY` in `.env`.
Missing or wrong key → `401`.

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/stats` | GET | — | `{ totalClients, totalLeads, leadsLast7Days }` |
| `/clients` | GET | — | `{ clients: [...] }` |
| `/clients` | POST | client fields (see below) | `201` + `{ client }` |
| `/clients/:id` | GET | — | `{ client }` or `404` |
| `/clients/:id` | PUT | any subset of client fields | `{ client }` — only sent fields change |
| `/clients/:id` | DELETE | — | `{ ok: true }` — cascades to their leads |
| `/leads` | GET | query: `?clientId=&limit=&offset=` | `{ leads: [...] }` |
| `/leads/:clientId/export.csv` | GET | — | CSV file download |

**Client fields** (all optional except `businessName`): `businessName`,
`aboutText`, `services`, `faqs`, `hours`, `bookingInfo`, `contactEmail`,
`brandColor` (hex, e.g. `#d4ff00`), `greeting`.

### Everything else

`GET /health` → `{ ok, keyConfigured, adminConfigured }` — useful for
uptime checks. Unmatched `/api/*` routes → `404`. Any unhandled error in a
route → logged with full detail server-side, `500` with a generic message
to the client (never leaks internals).

## Security measures, and why each exists

- **Input validation (`zod`)** — every request body is checked against a
  schema before it reaches the database or the AI. Bad input gets a clear
  `400`, not a stack trace or a bad database write.
- **Rate limiting** — a generous baseline on all `/api/*` routes, tighter
  limits specifically on `/chat` (costs money per call) and `/lead`
  (spam-prone, unauthenticated).
- **Constant-time admin-key comparison** (`lib/auth.js`) — a plain `===`
  leaks timing information proportional to how many characters match; this
  hashes both sides first and compares with `crypto.timingSafeEqual`.
- **No native SQL string-building** — all queries are parameterized
  prepared statements via `better-sqlite3`.
- **Static file scope** — only `index.html` and everything under `public/`
  are servable over HTTP. `server.js`, `routes/`, `lib/`, and the database
  file are never reachable by URL, even though they live in the same
  project folder.
- **Shadow DOM widget** — `widget.js` renders inside a Shadow DOM, so a
  client's own site CSS can't break the widget's look, and the widget's
  styles can't leak onto their page.
- **Helmet security headers** on every response. Content-Security-Policy is
  deliberately left off, because `index.html` / `admin.html` / `widget.js`
  all use inline `<script>`/`<style>` — a strict CSP would need per-request
  nonces to allow that, which is more complexity than this project's threat
  model calls for.

## Error handling and logging

Every async route is wrapped in `asyncHandler` (`lib/asyncHandler.js`), so
a thrown error or rejected promise is forwarded to Express's error
middleware instead of crashing the process or hanging the request. That one
central handler (bottom of `server.js`) logs the full error with
`lib/logger.js` (structured JSON, one line per event) and always returns a
generic `{ error: "Internal server error" }` to the client — internals
never leak in a response.

`lib/env.js` runs once at startup and logs every configuration problem
(missing API key, missing admin key, invalid port, half-configured SMTP)
clearly and all at once, instead of each one surprising you individually
the first time it's hit.

## Running it

```
npm install
npm start        # or: npm run dev  (restarts on file changes)
npm test          # 34 tests, node:test + supertest, in-memory database
```

`server.js` exports the configured Express `app` and only calls
`app.listen()` when run directly (`require.main === module`). Tests
`require('../server')` to get the app without binding a real port, and
drive it with `supertest` instead — set `process.env.DB_PATH = ':memory:'`
before requiring it for a clean, isolated database per test file.

## Deploying

Any host that runs `npm install && npm start` works: Render, Railway,
Fly.io, or a plain VPS with `pm2`/systemd + nginx for TLS.

Required environment variables in production: `ANTHROPIC_API_KEY`,
`ADMIN_KEY`. Set `TRUST_PROXY=1` if the host sits behind a reverse proxy
(Render/Railway/Fly.io all do) — this makes rate limiting and logging use
the real client IP from `X-Forwarded-For` instead of the proxy's own IP.
Leave it unset on a bare/direct deployment, where trusting that header
would let clients spoof their IP.

The SQLite file (`data/chatpilot.db`) must live on **persistent** storage —
if your host wipes the filesystem on every deploy, mount a persistent disk
at `data/` or every deploy will erase all clients and leads.

## Extending this

A few natural next additions, and where they'd go:

- **Multi-user admin accounts** (instead of one shared `ADMIN_KEY`) — would
  replace `lib/auth.js`'s key check with real sessions/JWTs and a `users`
  table in `lib/db.js`.
- **Lead status tracking** (New / Contacted / Closed) — add a `status`
  column to `leads`, a `PATCH /api/admin/leads/:id` route, and a dropdown
  in `admin.html`'s leads table.
- **Per-client analytics** (messages per day, most-asked questions) — would
  mean logging chat events to a new table in `routes/widget.js`'s `/chat`
  handler, then a dashboard chart reading from it.
- **Swapping the database** — everything database-related is isolated in
  `lib/db.js`; nothing else in the codebase writes SQL, so swapping SQLite
  for Postgres later means rewriting that one file, not the routes.
