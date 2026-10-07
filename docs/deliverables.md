# Deliverables

Campus Lost & Found (Findr). Everything we build comes from the two workstreams below. Nothing outside this list is built unless we agree to add it.

Starting point: every screen already exists in the UI, but the backend has 7 endpoints, auth is not wired (NextAuth is imported by the forms with no server handler), and `x-user-id` is trusted as identity. Workstream 2 is therefore mostly wiring, hardening, states and tests rather than building screens from scratch.

Reference docs: the rest of this folder ([README](README.md)) holds the product rules, API contracts and handoff notes. Where those docs target NextAuth, our decision is a custom session system, and the affected docs are updated in the same change as the code.

## Baseline (measured before any change)

- Type-check, lint, the 15 existing unit tests and the production build all pass.
- `npm audit` reports 5 high advisories, all transitive: the Prisma CLI's `mysql2` and `deepmerge-ts`, and `source-map-js` in the CSS toolchain. Reviewed in section 7.
- Neon database: Postgres 18, all 4 migrations applied, seed data only (1 admin, 8 categories, 8 locations, 11 items, no claims or media). About 225 ms per query from this machine.
- Dev server: http://localhost:3100. Ports 3000 and 3001 are used by other projects on this machine.

## How we work

1. One section at a time, in roadmap order.
2. For each section I write the plan with alternatives and trade-offs for every real choice. You decide, and the decision goes in the log at the bottom.
3. I build the section with end-to-end tests for every API in it.
4. The local server stays up so you can check each section. Boxes are ticked when you are happy.

## Ground rules for every deliverable

- No comments in code.
- Small reusable helpers. Route handlers stay thin: parse input, authorize, call a service, respond. Business rules live in services.
- No over-engineering: the simplest standard solution that meets the must-have.
- Security on every API: authentication, ownership and role checks inside the query, schema validation of all input, no private data in a response before the caller is allowed to see it, rate limits on abuse-prone routes, same-origin check on state-changing requests.
- Idempotency: repeating a state-changing request never duplicates or corrupts data and returns the current state.
- One error shape: `{ "error": string, "fields"?: Record<string, string[]> }` with correct status codes.

## Definition of done for an API

- [ ] Built on the shared helpers
- [ ] End-to-end tests over real HTTP against a real database cover: success, unauthenticated (401), wrong role or not the owner (403), invalid input (400), missing resource (404), conflict or repeat request (409 or identical result), and the resulting database state
- [ ] Listed in the API table below with its access rule
- [ ] Docs updated in the same change: `data-and-api.md` for contracts, plus architecture, local-development and testing-and-release when affected
- [ ] You checked it on the local server

## Roadmap

| # | Section | Workstream | APIs | Linear |
| --- | --- | --- | --- | --- |
| 0 | Foundation | both (required by your rules) | 0 | none |
| 1 | Auth and sessions | 1 | 4 | SOF-40, 41, 46 |
| 2 | KYC and protected actions | 1 | 2 | SOF-42, 14, 15 |
| 3 | Items | 1 | 6 | SOF-9, 10, 11, 12, 13, 15 |
| 4 | Claims and handover | 1 | 6 | SOF-16, 17, 18 |
| 5 | Admin moderation and reports | 1 | 5 | SOF-43 (reports are not in the Linear MVP) |
| 6 | Notifications | 1 | 2 | none (post-MVP in Linear, in your list) |
| 7 | Database, security, deployment, backend test suite | 1 | 1 | SOF-7, 8, 45, 46 |
| 8 | UI integration: auth, KYC, items | 2 | 0 | SOF-19, 21 to 25, 37, 38 |
| 9 | UI integration: dashboard, claims, handover, notifications, admin | 2 | 0 | SOF-26, 28 to 31, 44 |
| 10 | Loading, empty, error, unauthorized states; responsive; accessibility | 2 | 0 | SOF-20, 32 |
| 11 | Browser end-to-end workflows and final polish | 2 | 0 | SOF-19, 20 |

## Target API surface

26 endpoints: 19 new, 7 existing that need hardening. Access codes: Public, Session (signed in), Verified (signed in with approved ID), Owner (poster of the item), Party (poster or approved claimant), Admin.

| Method and path | Access | Section | Today |
| --- | --- | --- | --- |
| POST /api/auth/register | Public, rate limited | 1 | New |
| POST /api/auth/login | Public, rate limited | 1 | New |
| POST /api/auth/logout | Session | 1 | New |
| GET /api/me | Session | 1 | New |
| POST /api/me/verification | Session | 2 | New |
| POST /api/uploads | Session | 2 | Exists, auth is a stub |
| GET /api/items | Public | 3 | Exists, needs fixes |
| POST /api/items | Session (Verified or not: decide in section 2) | 3 | Exists, header auth |
| GET /api/items/:id | Public, viewer-aware | 3 | Exists, needs fixes |
| PATCH /api/items/:id | Owner | 3 | New |
| DELETE /api/items/:id | Owner | 3 | New |
| GET /api/me/items | Session | 3 | Exists, header auth |
| POST /api/items/:id/claims | Verified | 4 | Exists, auth is a stub |
| GET /api/items/:id/claims | Owner | 4 | New |
| GET /api/me/claims | Session | 4 | New |
| PATCH /api/claims/:id | Owner | 4 | New |
| GET /api/claims/:id/handover | Party | 4 | New |
| PATCH /api/claims/:id/handover | Party | 4 | New |
| POST /api/items/:id/reports | Session | 5 | New |
| GET /api/admin/verifications | Admin | 5 | New |
| PATCH /api/admin/verifications/:id | Admin | 5 | New |
| GET /api/admin/reports | Admin | 5 | New |
| PATCH /api/admin/reports/:id | Admin | 5 | New |
| GET /api/me/notifications | Session | 6 | New |
| PATCH /api/me/notifications | Session | 6 | New |
| GET /api/health | Public | 7 | Exists, add database check |

## Data model changes (final shape agreed per section)

| Change | Section | Why |
| --- | --- | --- |
| New `Session` table | 1 | Server-side sessions with logout and revocation (if DB-backed sessions are chosen) |
| `User`: submitted-at and rejection reason for KYC | 2 | Admin queue needs a date; rejected users need to know why |
| `IdempotencyKey` table | 3 | Safe retries of item and claim creation |
| `ClaimStatus` gains `CANCELLED` | 3 | Pending claims are closed when a post is removed; handover cancellation reuses it |
| `Claim` gains a nullable `handoverCode` | 4 | The code shown on the handover screen |
| New `Report` table | 5 | Users report posts, admins resolve them |
| New `Notification` table | 6 | In-app notifications |
| Rate-limit counters, drop unused `VerificationToken` | 7 | Abuse protection and cleanup after removing NextAuth |

## Section 0. Foundation

Not in your list, but required by your rules (local server, end-to-end tests for every API, reusable functions).

- [x] 0.1 Local setup: `.env` from the values you gave (gitignored, never in tracked files), dependencies installed, Prisma client generated, dev server on http://localhost:3100
- [x] 0.2 Baseline before any change: type-check, lint, existing tests and production build
- [x] 0.3 Dev server on the Neon development database (as `local-development.md` describes), and one database client module instead of two
- [x] 0.4 End-to-end harness: builds and starts the app on :3101 against an isolated `e2e` schema in the same Neon database (`E2E_DATABASE_URL` can point at a separate branch instead), resets and seeds it, HTTP client with cookie jar, user factories
- [x] 0.5 Shared API helpers: error type, route wrapper, body and query validation, same-origin check, database-backed rate limiter (pagination moves to section 3, where the list endpoints are)
- [x] 0.6 `npm test` (unit) and `npm run test:e2e` documented in the README and docs

## Section 1. Auth and sessions

- [x] 1.1 Registration (name, phone, school email, password) with duplicate email and phone handling
- [x] 1.2 Login with a generic failure message, constant-time password check and a login rate limit
- [x] 1.3 Logout that invalidates the session on the server
- [x] 1.4 Session handling: secure cookie, expiry, one current-user lookup shared by API routes and server components
- [x] 1.5 Replace `x-user-id`, `getCurrentUser`, `getShellUser` and `requireUser` with one session API, and remove NextAuth
- [x] 1.6 Minimal UI swap so you can log in on the dev server (login form, register form, log out button)
- [x] 1.7 Admin seed account on the new password hashing (new databases get an scrypt admin; the existing dev admin row still holds the old bcrypt hash and cannot log in until it is reset in section 5)
- [x] 1.8 End-to-end tests: register, login, logout, me, expiry, rate limit, cross-origin rejection

## Section 2. KYC and protected actions

- [x] 2.1 KYC submission: a signed-in user submits their uploaded ID image, status becomes PENDING, resubmission after rejection is allowed, and the image must be that user's own `kyc/` upload
- [x] 2.2 Verification status (NOT_SUBMITTED, PENDING, VERIFIED, REJECTED with reason) returned by `GET /api/me`
- [x] 2.3 Protected-action guards for signed in, verified and admin, in one place and reused by every route (the verified guard is now on claim submission; claim approval gets it in section 4)
- [x] 2.4 `/api/uploads` on real authentication with per-purpose rules and a per-user rate limit; ID images stay private because attached keys are checked for owner and purpose
- [x] 2.5 End-to-end tests, including a real round trip to the R2 bucket
- [ ] 2.6 Browser uploads to R2 work from the app's origin. Blocked on the bucket's CORS policy, which only the Cloudflare dashboard can change (see `local-development.md`)

## Section 3. Items

- [x] 3.1 Categories and locations from the database: the APIs accept and validate database ids. There is no `/api/meta` endpoint; the server pages read the lists straight from the database in section 8
- [x] 3.2 List, search and detail: filters by real ids, text search across title, description, location note, category and location, whole-day date range, exact `total`, viewer-aware detail (`isOwner`, `myClaim`, `claimCount`), signed media URLs, removed items hidden from everyone but the owner and admins
- [x] 3.3 Create: authenticated, media keys checked for ownership and type, at most 5 files, daily limit, idempotent with `Idempotency-Key`
- [x] 3.4 Edit: owner only, while the item is OPEN, one conditional update
- [x] 3.5 Delete: owner only, soft delete to REMOVED while OPEN, pending claims closed as CANCELLED in one transaction, safe to repeat
- [x] 3.6 Status transitions in one table and one guarded update, reused by sections 4 and 5
- [x] 3.7 My items (removed items left out)
- [x] 3.8 End-to-end tests

## Section 4. Claims and handover

- [x] 4.1 Claim submission on real auth and the verified rule, idempotent with `Idempotency-Key`, 20 per user per day
- [x] 4.2 Claim listing: owner sees claims on their item with proof and 5-minute signed media; claimant sees their own claims
- [x] 4.3 Approval and rejection by the item owner only (approval also needs an approved ID)
- [x] 4.4 Transactional approval: approve one claim, set the item to CLAIMED, reject every competing pending claim, all or nothing
- [x] 4.5 Contact disclosure (name, phone and WhatsApp link) only to the poster and the approved claimant, only while the handover is active; email is never shared
- [x] 4.6 Handover completion (item RESOLVED), cancellation and item reopening (claim CANCELLED, item OPEN again), with a shared six-character code
- [x] 4.7 Authorization matrix tests: owner, claimant, third party, signed out, admin
- [x] 4.8 End-to-end tests including racing approvals, approve against reject, approve against delete, complete against cancel, repeated requests, and a full report-to-return journey

## Section 5. Admin moderation and reports

- [ ] 5.1 KYC queue for admins: pending submissions with a signed, short-lived image URL
- [ ] 5.2 KYC approve and reject with a reason
- [ ] 5.3 Users report a post with a reason
- [ ] 5.4 Report queue for admins: dismiss, or remove the item
- [ ] 5.5 Admin-only enforcement and end-to-end tests

## Section 6. Notifications

- [ ] 6.1 In-app notifications created in the same transaction as the event: claim received, claim approved or rejected, handover completed or cancelled, KYC decision, item removed by an admin
- [ ] 6.2 List with unread count, mark all or selected as read (repeat-safe)
- [ ] 6.3 End-to-end tests

## Section 7. Database, security, deployment, backend test suite

- [ ] 7.1 Constraints and migrations: clean chain that builds from an empty database, the two partial unique indexes kept, new constraints for the invariants the app relies on, idempotent seed
- [ ] 7.2 Security pass: security headers, cookie flags, rate limits on login, register, uploads, claims and reports, request size limits, error responses that do not leak internals, log redaction, dependency audit
- [ ] 7.3 Deployment configuration: build and migrate steps, documented environment variables in `.env.example` (no real values), health check with database check, pooled connection guidance; deploying only on your explicit go-ahead
- [ ] 7.4 Backend test suite: unit tests for pure rules, end-to-end tests for all 26 endpoints, one command to run everything

## Section 8. UI integration: auth, KYC, items

- [ ] 8.1 Login, registration and ID verification screens on the real auth and KYC APIs, with callback URLs, validation messages and error states
- [ ] 8.2 Report item flow on real categories, locations and uploads
- [ ] 8.3 Edit item flow on the real API
- [ ] 8.4 Browse and item detail on real data; mock data, mock images and the development fallback removed
- [ ] 8.5 Navigation and page guards: signed out goes to login with a way back, unverified sees the verify prompt, admin pages are admin only

## Section 9. UI integration: dashboard, claims, handover, notifications, admin

- [ ] 9.1 Dashboard with my items and my claims
- [ ] 9.2 Claim submission connected to uploads and the API
- [ ] 9.3 Claim review (approve, reject) on the real API
- [ ] 9.4 Handover on the real API: contact details, code, complete, cancel
- [ ] 9.5 Notifications screen and unread badge in the navigation
- [ ] 9.6 Admin moderation and verification screens on the real API

## Section 10. States, responsive, accessibility

- [ ] 10.1 Loading, empty, error and unauthorized states as shared components used on every route
- [ ] 10.2 Responsive review at phone, tablet and desktop widths
- [ ] 10.3 Accessibility review: keyboard, focus, labels, contrast, landmarks

## Section 11. Browser end-to-end and polish

- [ ] 11.1 Browser tests for the main workflows: register, verify, report, claim, approve, hand over; reject path; cancel and reopen; admin KYC and report moderation; unauthorized access
- [ ] 11.2 Final polish and cleanup: one item card (retire the duplicate), remove dead code, refresh the README and design-system docs
- [ ] 11.3 Final full run: lint, types, unit tests, API end-to-end tests, browser tests, production build

## Open items outside the code

| Item | Needed for | Who |
| --- | --- | --- |
| Add a CORS policy to the R2 bucket for the app's origins | Any browser upload: items, claims, ID photos | You, in the Cloudflare dashboard |
| Reset the seeded admin's password | The admin screens (section 5) | Me, when we reach section 5 |
| Update the Linear tickets for the routes decided here | Keeping the tickets true | You |

## Out of scope (not in your list)

Password reset, email verification, social login, email or push or real-time notifications, search ranking, image moderation, admin user management beyond KYC and reports, translations, dark mode.

## Decision log

| # | Decision | Chosen |
| --- | --- | --- |
| D1 | Database | Dev server on the Neon development database, as the docs describe. End-to-end tests run in an isolated `e2e` schema of the same database; one variable switches them to a separate Neon branch |
| D2 | Session design | DB-backed sessions: a random token in an HttpOnly cookie, only its hash stored |
| D3 | Idempotency | State rules that are safe to repeat, plus an `Idempotency-Key` header on item and claim creation |
| D4 | KYC route names | Keep the UI's paths: `POST /api/me/verification`, status from `GET /api/me`, admin on `/api/admin/verifications` |
| D5 | Which actions need an approved ID | Claim and approve a claim only. Posting needs a login |
| D6 | Git workflow | One branch per section named `type/short-topic`, committed per section, pushed with a PR after each section |
| D7 | Taxonomy contract | Database ids. The UI reads categories and locations from the database and sends ids; no slugs and no taxonomy endpoint |
| D8 | Search | Case-insensitive match across title, description, location note, category and location; every word must match somewhere |
| D9 | Deleting a post with pending claims | Allowed while the item is OPEN; the claims are closed as CANCELLED in the same transaction |
| D10 | Handover route names | Keep the UI's paths: `GET` and `PATCH /api/claims/:id/handover` |
| D11 | Handover code | Shared six-character code shown to both people to compare in person; either person can complete or cancel |
| D12 | Contact shared after approval | Name, phone and a WhatsApp link only; email stays private |

Defaults accepted with the Sections 0 and 1 plan: Node `scrypt` password hashing; cookie `findr_session`, HttpOnly, SameSite=Lax, Secure over HTTPS, 14 days; Origin check on state-changing requests; phone numbers normalised to +234 format; rate-limit counters in the database; API end-to-end tests over real HTTP; server pages read through shared service functions; in-app notifications only.

Defaults accepted with the Section 2 plan: KYC review state lives in two new columns on `User` (a `KycSubmission` history table was the alternative); resubmitting the same ID photo while pending is a safe repeat; a different photo while pending, or an already verified user, gets 409.

Defaults accepted with the Section 4 plan: approving needs an approved ID but rejecting does not; approving rejects every other pending claim; cancelling a handover reopens the item and keeps competing claims rejected so people can claim again; admins get no access to claims or contact; contact and code disappear once a handover is finished or cancelled; claim submission is limited to 20 per user per day.

Defaults accepted with the Section 3 plan: editing changes text, date, category and location but not photos; `Idempotency-Key` is optional; item creation is limited to 20 per user per day; removed items stay visible to their owner and to admins.

Calls made while building Sections 0 and 1, open to change: the `pg` driver adapter everywhere; per-IP rate limits kept generous because campus networks share IPs (see `src/lib/auth/limits.ts`); migrations generated by diffing schema files and applied with `migrate deploy`.

## To settle in their section

The project docs flag these conflicts between the UI and Linear. Each gets alternatives and trade-offs in its section plan.

| Section | Decision |
| --- | --- |
| 5 | Moderation scope: user reports with an admin report queue (current UI), or an admin item list with remove (Linear) |
| 6 | Notifications are in your list but post-MVP in Linear: confirm they stay in scope |
| 7 | Hosting target (Vercel or Cloudflare via OpenNext) and a staging environment |
