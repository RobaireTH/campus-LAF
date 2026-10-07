# campus-LAF

**Campus Lost & Found** (SIWES Group 1). Students and staff report lost or found items, search them, claim with proof, and get the owner's contact once the poster approves.

One full-stack Next.js app: the pages and the API live together. This repo is a scaffold. Features are tracked in Linear (project *Campus Lost & Found*).

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- API: Next.js route handlers in `src/app/api/`, validated with zod
- Auth: built in (scrypt passwords, database-backed sessions in an HttpOnly cookie)
- Database: PostgreSQL on Neon via Prisma
- Uploads: Cloudflare R2 (presigned URLs), or the local file store when running the demo

## Getting started

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev
```

Open http://localhost:3000. The API health check is at http://localhost:3000/api/health.

## Run the demo locally

Everything runs on your machine, with no cloud accounts: a Postgres container, a small local file store for photos, and the app, filled with demo accounts and posts that have real photos. You need Node and Docker.

```bash
npm install
npm run local:setup
npm run local:start
```

Open http://localhost:3100. `local:setup` creates `.env.local` with generated passwords (open it to read or change them), starts the database, applies the migrations and loads the demo data. `local:start` runs the database, the file store and the app together.

| Account | Role |
| --- | --- |
| `admin@campuslaf.test` | Admin: password is `SEED_ADMIN_PASSWORD` in `.env.local` |
| `amaka.obi@campuslaf.test` | Poster with claims waiting on her rucksack, and a handover in progress |
| `tunde.bello@campuslaf.test` | Claimant with a pending claim, and a returned jacket |
| `ngozi.eze@campuslaf.test` | Claimant whose claim was approved (open its handover for the code) |
| `emeka.nwosu@campuslaf.test` | Another student, with a pending claim of his own |
| `chidi.okafor@campuslaf.test`, `zainab.musa@campuslaf.test` | IDs waiting for the admin to review |
| `tolu.adeyemi@campuslaf.test` | ID rejected, so the screen shows the admin's reason |

Every demo account shares the password `SEED_DEMO_PASSWORD` from `.env.local`. The admin sees two IDs to review and a scam post with two reports. Photos upload straight to the local file store, so reporting an item with photos works.

| Command | What it does |
| --- | --- |
| `npm run local:demo` | Put the demo data back to how it started |
| `npm run local:stop` | Stop the database container (the data stays) |
| `npm run local:reset` | Delete the local data and set everything up again |

The demo seed refuses to run against a database that is not on your machine. The photos in `prisma/demo/images` are CC0 stock photos (credits in `ATTRIBUTION.md`) and synthetic ID cards and receipts.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end API tests (builds the app and runs it against an isolated database schema) |
| `npm run typecheck` | Generate Next's route types and type-check |
| `npm run verify` | Lint, types, unit tests and the end-to-end suite |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a migration in dev |

## Layout

```
prisma/          schema + migrations
src/
  app/           pages (App Router)
  app/api/       route handlers
  components/    shared UI components
  lib/           db client, auth helpers, API client
```
