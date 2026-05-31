# 💰 Spendix

A personal finance tracker with month-scoped budgets, streaming AI-powered insights, and a security model that takes itself seriously. Built as a single Next.js 16 deployment with React Server Components, edge-validated cookie auth, and Vercel AI SDK streaming for the Gemini-powered insights flow.

---

## Highlights

- **Server components everywhere.** Every authenticated page pre-renders on the server from Mongoose queries, with auth state hydrated by decoding an `httpOnly` JWT cookie inside the root layout — no client-side fetches, no spinner flashes on first paint.

- **Edge-validated cookie auth.** Sessions sit in `httpOnly` cookies and are verified at the Next.js edge proxy via `jose`, with per-purpose audience claims (session / verify-email / password-reset) keeping each token usable only for its intended flow.

- **Auto-invalidating password resets.** Reset tokens are signed with a per-user key (`JWT_SECRET + bcrypt hash`), so a successful reset rotates the hash and instantly invalidates every outstanding reset link — single-use semantics without a revocation table.

- **Streaming AI insights.** Gemini output streams to the browser via the Vercel AI SDK while an `onFinish` callback parses and persists the result server-side, gated by a 1-call/hour per-user rate limiter that refunds slots on upstream failure.

- **Month-scoped budgets.** A single MongoDB collection keyed by `(userId, month)` with a `"default"` sentinel template; each month resolves via lazy custom-to-default fallback — no nightly copy jobs, no "open new month" UI rituals.

- **Cascading category rename.** Renaming a budget category updates every monthly snapshot of that budget *and* every existing transaction document via per-collection `updateMany`, gated by a collision pre-check that refuses to merge two existing names.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Database | MongoDB + Mongoose 9 |
| Auth | `jsonwebtoken` + `jose` (edge), `bcryptjs`, `httpOnly` cookies |
| AI | Vercel AI SDK 6 + Google Gemini (`@ai-sdk/google`) |
| Anti-abuse | Cloudflare Turnstile, per-user in-memory rate limiter |
| Email | Nodemailer + SMTP (Gmail in dev) |
| UI | Bootstrap 5.3 (dark theme), `react-bootstrap`, Chart.js, `react-select`, `react-toastify` |
| Local dev DB | `mongodb-memory-server` (no external Mongo required) |

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure `.env.local`

Create a `.env.local` in the project root. For local development with the in-memory database and Cloudflare's published test keys, the minimum is:

```env
# Anything > 16 chars works for dev
JWT_SECRET=replace_me_with_a_random_string

# Cloudflare Turnstile — these are Cloudflare's documented test keys
# that always pass; use real keys in production.
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Email (verification + password reset). Display name is "Spendix";
# the address is whatever you authenticate with.
EMAIL_FROM=Spendix
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_gmail_app_password

# Where the verify-email / reset-password links should point
BACKEND_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

# Google Gemini for AI insights
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

**Leave `MONGODB_URI` unset** to let the app spin up `mongodb-memory-server` on first DB call (data persists to `.mongo-data/` between dev-server restarts). Or set it to any Mongo connection string (local mongod, Atlas, etc.) to use that instead.

### 3. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). On the very first request that hits the DB, `mongodb-memory-server` downloads a portable `mongod` binary (~70 MB) into `node_modules/.cache/mongodb-binaries/`. Subsequent runs are instant.

---

## Environment Variables (reference)

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | yes | Shared by `jsonwebtoken` (server) and `jose` (edge proxy) |
| `MONGODB_URI` | no | Leave unset for in-memory dev mode |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | Exposed to the browser |
| `TURNSTILE_SECRET_KEY` | yes | Server-side verification |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | yes | Anywhere SMTP-reachable |
| `EMAIL_FROM` | optional | Display name only; address is always `SMTP_USER` |
| `BACKEND_URL` | yes | Origin used to build verify-email + reset-password links |
| `CLIENT_URL` | yes | Reserved for cross-origin redirects |
| `GEMINI_API_KEY` | yes (for insights) | Get one at [aistudio.google.com](https://aistudio.google.com) |
| `GEMINI_MODEL` | yes (for insights) | e.g. `gemini-2.5-flash` |

---

## Project Structure

```
src/
├── app/
│   ├── api/                      # Route Handlers (REST API)
│   │   ├── auth/                 # signup, login, logout, me, verify-email,
│   │   │                         # resend-verification, forgot-password,
│   │   │                         # reset-password
│   │   ├── budgets/              # GET, PUT /update, DELETE /:cat, POST /rename
│   │   ├── transactions/         # create, all, [id], delete/[id]
│   │   ├── charts/               # category-totals, monthly-trends, …
│   │   └── insights/             # streamText() with onFinish persist
│   ├── (pages)/                  # Server components that render the UI
│   │   ├── dashboard/page.js + DashboardClient.jsx
│   │   ├── budgets/page.js + BudgetsClient.jsx
│   │   ├── transactions/page.js + TransactionsClient.jsx
│   │   ├── charts/page.js + ChartsClient.jsx
│   │   ├── insights/page.js + InsightsClient.jsx
│   │   └── (auth pages: login, signup, forgot-password, etc.)
│   ├── layout.js                 # Reads cookie → hydrates AuthContext
│   ├── error.js                  # Friendly fallback for unhandled errors
│   └── globals.css               # Dark-theme Bootstrap overrides
├── components/                   # Modals, Navbar, ConfirmDialog, etc.
├── context/AuthContext.jsx
├── lib/
│   ├── mongoose.js               # Connection cache + auto-respawn
│   ├── serverAuth.js             # requireServerUser() helper for RSC
│   ├── requireAuth.js            # API-route auth + cookie helpers
│   ├── budgetHelpers.js          # getBudgetForMonth() w/ default fallback
│   ├── monthRange.js             # parseMonth(), currentMonthLabel()
│   ├── jwtAudience.js            # AUD_SESSION / AUD_VERIFY_EMAIL / AUD_PASSWORD_RESET
│   ├── passwordReset.js          # Per-user-keyed reset token sign/verify
│   ├── verifyTurnstile.js
│   ├── rateLimiter.js
│   ├── emailService.js           # Styled HTML templates
│   └── models/                   # Mongoose schemas (User, Transaction, Budget, Insight)
├── proxy.js                      # Next.js 16 edge proxy
└── utils/                        # Pure client-side helpers
```

---

## Architecture Notes

A few decisions that aren't obvious from the file tree:

### Cookie hydration kills `/api/auth/me`

The root layout is an `async` server component that reads the session cookie with `cookies()` from `next/headers`, decodes the JWT, and passes the user as a prop to `AuthContext`. The client never fetches its own auth state on mount — the initial HTML already encodes it.

### Edge proxy uses `jose`, route handlers use `jsonwebtoken`

`jsonwebtoken` depends on Node's `crypto` and doesn't run on the Edge runtime where the proxy lives. `jose` is Edge-compatible and verifies HS256 tokens produced by `jsonwebtoken` interchangeably, so both sides share the same secret + audience claims.

### Password reset tokens are single-use *without* a DB table

Reset JWTs are signed with `${JWT_SECRET}:${user.password}` (per-user key). On verify we look up the user, reconstruct the key, and verify. Since the user's bcrypt hash changes the moment they reset, the same token can never be used twice. No "used tokens" table to maintain.

### Budget data model

Single `Budget` collection keyed by `(userId, month)` with a unique compound index. `month` is `"YYYY-MM"` (custom) or `"default"` (template). Read path is: try `(userId, requested_month)` → fall back to `(userId, "default")`. Months before the user signed up still render meaningfully because they fall back to the default.

### Insight generation flow

```
POST /api/insights
  ├─ auth check
  ├─ load last 100 transactions for current month
  ├─ if empty → 200 + "no transactions" message (no Gemini call, no quota burn)
  ├─ checkRateLimit(userId, 1/hr)
  ├─ streamText({ ..., onFinish, onError })
  │    ├─ onFinish: parse bullets, save Insight document
  │    └─ onError:  refundRateLimit(userId)
  └─ return result.toTextStreamResponse()  // text/plain chunked

Client reads res.body.getReader(), appends tokens to an optimistic insight row.
```

### Mongo connection resilience

`lib/mongoose.js` does:
1. A 500ms ping probe on cached connections before reuse
2. Listens for `disconnected` / `error` events to invalidate the cache
3. 5s `serverSelectionTimeoutMS` instead of the 30s default

This is mostly for `mongodb-memory-server` running behind aggressive Windows AV — if the child `mongod` dies, the next request transparently respawns it.

---

## Production Notes

Deploying to Vercel:

1. Push the `spendix/` directory to its own GitHub repo (root of the repo == this folder).
2. Set every env var from the table above in the Vercel project settings. Use **real** Cloudflare Turnstile keys (get them at [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add Site).
3. Replace `MONGODB_URI` with an Atlas connection string. The in-memory server isn't meant for production.
4. Set `BACKEND_URL` and `CLIENT_URL` to your deployed origin.

The rate limiter is in-memory and per-instance, so if you scale horizontally on Vercel it becomes "1 generation per user per instance per hour." Swap `lib/rateLimiter.js` for an Upstash Redis-backed implementation when this matters.

---

## Built by

[Sagar Choudhary](https://www.linkedin.com/in/sagar-kumar-choudhary-059741254/) — 2026
