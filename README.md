# campus-LAF

**Campus Lost & Found** (SIWES Group 1). Students and staff report lost or found items, search them, claim with proof, and get the owner's contact once the poster approves.

One full-stack Next.js app: the pages and the API live together. This repo is a scaffold. Features are tracked in Linear (project *Campus Lost & Found*).

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- API: Next.js route handlers in `src/app/api/`, validated with zod
- Auth: built in (scrypt passwords, database-backed sessions in an HttpOnly cookie)
- Database: PostgreSQL on Neon via Prisma
- Uploads: Cloudflare R2 (presigned URLs)

## Getting started

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev
```

Open http://localhost:3000. The API health check is at http://localhost:3000/api/health.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end API tests (builds the app and runs it against an isolated database schema) |
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
