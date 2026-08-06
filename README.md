# Lucky Couture

A tailoring & boutique marketplace: React (Vite) frontend + Node/Express/MongoDB backend.

## Why two folders instead of one?

`frontend/` is a **Vite** project — Vite bundles JavaScript that runs in the
**browser**. `backend/` is a **Node.js** server — it connects to MongoDB,
handles authentication, and does things a browser can never do (talk
directly to a database, hash passwords, hold secret keys). Vite has no way
to "absorb" that server code; it would need to run as its own process
either way. So each has its own `package.json` because they depend on
completely different libraries (React vs. Express/Mongoose) — that part
doesn't go away.

What *does* go away with the setup below: you no longer have to `cd` into
each folder, run `npm install` twice, and start two terminals by hand.

## One-time setup

```bash
npm install
```

That single command (run from this root folder) installs both `frontend/`
and `backend/` dependencies via npm workspaces, and automatically creates
`backend/.env` from `backend/.env.example` for you.

**Then open `backend/.env` and fill in at least:**
```
MONGO_URI=mongodb://127.0.0.1:27017/lucky_couture
JWT_SECRET=any-long-random-string
```
`MONGO_URI` can point to a local MongoDB install or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster — either works.
Nothing else in `.env` is required to get the API running; Cloudinary and
SMTP both have working fallbacks (local file storage / console-logged
emails) when left blank.

(Optional) seed the database with an admin account and sample data:
```bash
npm run seed
```

## Running it

```bash
npm run dev
```

This starts **both** the frontend (`http://localhost:5173`) and the
backend (`http://localhost:5000`) together, in one terminal, with
color-coded output. Stop both with `Ctrl+C`.

Run them separately if you ever need to:
```bash
npm run dev:frontend
npm run dev:backend
```

## If something errors on first run

- **`MONGO_URI is not set`** — you skipped filling in `backend/.env`. See setup above.
- **`Could not connect to MongoDB`** — MongoDB isn't running locally, or your Atlas connection string/IP allowlist is wrong.
- **Port already in use** — something else is already running on 5173 or 5000; stop it or change `PORT`/Vite's port.

## Folder structure

```
Lucky-Couture/
  package.json          ← root: npm workspaces + `npm run dev` orchestration
  scripts/
    setup-env.js          ← creates backend/.env on first install
  frontend/               ← Vite + React app (see frontend/README.md)
  backend/                 ← Express + MongoDB API (see backend/README.md)
```

The frontend currently runs on local mock data (`frontend/src/data/mockData.js`)
and browser storage for cart/wishlist/auth — it is **not yet wired** to this
backend's real API. That's the natural next step once you're ready: swap
the mock data and `AppContext.jsx` for `fetch`/`axios` calls against the
endpoints documented in `backend/README.md`.
