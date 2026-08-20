# ScribbleWriter

**Write On The Fly.**

ScribbleWriter turns rough drafts and fragments into a structured,
well-written book — in your own voice, not a generic AI voice.

## How it works

- **Scribble** — drop anything here: a line, a memory, a half-formed
  idea. It lands in your inbox, unsorted, timestamped.
- **Book** — your shelf of manuscripts. Each book is chapters, each
  chapter has an editable title, summary, and body.
- **Setup** — upload a short sample of your own writing. Every AI
  placement and rewrite uses it to stay in your tone.

The core idea: fragments don't get silently rewritten into the book.
You tap **Place in Book** on a fragment, the AI proposes which chapter
it belongs in and rewrites it in your voice, and you see that proposal
and can edit it before it's committed to the manuscript. Nothing
happens to your fragment without you seeing it first.

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind, served as static
  assets by the Worker.
- **Backend**: a single Cloudflare Worker (Hono) handling `/api/*` and
  falling through to static assets otherwise. No separate Pages
  project — one deploy target.
- **Database**: Cloudflare D1 (SQLite at the edge).
- **Auth**: email + password, PBKDF2 hashing via Web Crypto, signed
  session cookies. No email verification (yet) — kept simple for v1.
- **AI**: server-side calls to the Anthropic API from within the
  Worker, so the API key never reaches the client.

## Project layout

```
worker/           Cloudflare Worker source (API + auth + AI calls)
  src/
    index.ts          entry point, routing
    auth-middleware.ts session-cookie auth guard
    crypto.ts          password hashing, session tokens
    types.ts           shared TS types for D1 rows
    routes/
      auth.ts          signup / login / logout / me
      books.ts         the shelf
      chapters.ts       the manuscript within a book
      fragments.ts      the Scribble inbox
      voice.ts          the writing-style sample
      ai.ts             placement proposal + commit

frontend/         Vite React app
  src/
    api.ts             typed fetch client, one place all API calls go
    AuthContext.tsx     current-user state
    components/
      EditableText.tsx  the one inline-edit primitive used everywhere
      NavBar.tsx         Setup / Books / Record+Type bottom nav
    pages/
      Login.tsx, Signup.tsx
      Shelf.tsx          grid of book covers
      BookDetail.tsx      chapters, inline-editable
      Scribble.tsx        fragment capture + AI placement flow
      Setup.tsx           voice sample + account

migrations/        D1 schema
wrangler.toml       Worker + D1 + static-assets config
```

## Local development

```bash
npm install                 # installs root + frontend workspace
cd worker && npm install    # worker deps (Hono, wrangler types)

# create a local D1 database and apply the schema
npx wrangler d1 create scribblewriter-db   # copy the database_id into wrangler.toml
npm run db:migrate:local

# terminal 1: the worker (serves /api/* and, once built, static assets)
npm run dev:worker

# terminal 2: the frontend dev server (hot reload, proxies /api to :8787)
npm run dev:frontend
```

You'll need to set two secrets before AI placement or real deploys work:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put SESSION_SECRET   # any random string
```

(`SESSION_SECRET` is reserved for future use — sessions are currently
looked up directly in D1 rather than signed/verified client-side, but
the binding is wired through `wrangler.toml` for when that changes.)

## Deploying

Once `wrangler.toml` has a real `database_id` (from `wrangler d1
create`) and the secrets above are set:

```bash
npm run deploy
```

Or connect this repo to Cloudflare Pages/Workers via the dashboard for
automatic deploys on every push to `main`.

## What's intentionally not built yet

- **Voice recording → transcription.** The Record button in the nav
  bar is visibly disabled. There's no speech-to-text service wired up;
  Anthropic's API doesn't do audio transcription, so this needs an
  external service (e.g. Whisper) and its own API key before it can
  work honestly.
- **Chapter drag-to-reorder UI.** The API route exists
  (`POST /chapters/book/:bookId/reorder`) but there's no drag
  interaction wired to it in the frontend yet.
- **Email verification.** Signup is plain email + password by design,
  for now.
