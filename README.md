# campus-laf-fe

Frontend for **Campus Lost & Found** (SIWES Group 1). Students and staff report lost or found items, search them, claim with proof, and get the owner's contact once the poster approves.

This repo is an empty scaffold. Features are tracked in Linear (project *Campus Lost & Found*).

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- NextAuth.js (login + sessions)
- Talks to the Express API in [campus-laf-be](https://github.com/RobaireTH/campus-laf-be)

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint |

## Layout

```
src/
  app/         routes (App Router)
  components/  shared UI components
  lib/         API client, helpers
```
