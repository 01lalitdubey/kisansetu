# 🌾 KisanSetu AI — Backend

REST API that powers all three dashboards (**Farmer**, **Procurement Centre**, **Admin**)
from a single PostgreSQL database. It replaces the frontend's mock services.

- **Node.js + Express + TypeScript**
- **PostgreSQL** (Supabase-ready) via **Prisma**
- **Zod** validation · **JWT** auth · **bcrypt** hashing · **Helmet** + **CORS**
- **Swagger UI** at `/api/docs`
- AI endpoints use a **deterministic** service today; a Python ML service replaces it later.

---

## Quick start

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL

npm install
npx prisma migrate dev        # create tables
npm run prisma:seed           # demo data (5 centres, 12 farmers, tokens, …)
npm run dev                   # http://localhost:5000/api  (docs at /api/docs)
```

Run the end-to-end check (re-seeds, then drives the whole demo flow over HTTP):

```bash
npm run test:api
```

### Database options

**A — Supabase (recommended for the hackathon).** Create a project, then from
*Project Settings → Database*:

```env
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

`prisma migrate` uses `DIRECT_URL`; the app uses `DATABASE_URL`.

**B — Local Postgres via Docker** (used while building this):

```bash
docker run -d --name kisansetu-pg \
  -e POSTGRES_USER=kisansetu -e POSTGRES_PASSWORD=kisansetu -e POSTGRES_DB=kisansetu \
  -p 55432:5432 postgres:16-alpine
```

```env
DATABASE_URL="postgresql://kisansetu:kisansetu@localhost:55432/kisansetu?schema=public"
DIRECT_URL="postgresql://kisansetu:kisansetu@localhost:55432/kisansetu?schema=public"
```

---

## Demo logins

| Role | Email | Password |
| ---- | ----- | -------- |
| Farmer | `farmer@demo.com` | `demo1234` |
| Centre Officer | `officer@demo.com` | `demo1234` |
| Admin | `admin@demo.com` | `demo1234` |

`POST /api/auth/login` with `{ "identifier": "<email or mobile>", "password": "demo1234" }`
→ `{ token, user }`. Send `Authorization: Bearer <token>` on protected routes.

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma        15 models, 9 enums
│   ├── seedData.ts          canonical demo constants (shared with demo reset)
│   ├── seed.ts              wipes + seeds the database
│   └── migrations/
├── src/
│   ├── config/    env.ts (zod-validated), database.ts (Prisma singleton)
│   ├── middleware/ authMiddleware, roleMiddleware, errorMiddleware (+ asyncHandler)
│   ├── utils/     response.ts (ok/fail/ApiError), validation.ts (zod helpers)
│   ├── services/  business logic + transactions — the only layer that touches Prisma
│   │   authService  farmerService  centerService  queueService  tokenService
│   │   procurementService  notificationService  analyticsService
│   │   recommendationService (deterministic AI)  demoService
│   ├── controllers/ thin: validate -> service -> ok()
│   ├── routes/    one router per controller, mounted in app.ts
│   ├── docs/      openapi.ts  (served by swagger-ui at /api/docs)
│   ├── app.ts     express app (helmet, cors, json, routes, error handler)
│   └── server.ts  bootstrap + graceful shutdown
└── tests/api.test.ts  in-process HTTP smoke test (66 checks)
```

**Layering rule:** `routes → controllers → services → Prisma`. Controllers never
touch the database directly; services own all transactions.

---

## API reference

Base URL: `http://localhost:5000/api` · full interactive docs at **`/api/docs`**.

### Auth
| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/auth/login` | `{ identifier, password }` → `{ token, user }` |
| POST | `/auth/register` | farmer self-signup |
| GET | `/auth/me` | 🔒 current user |

### Farmer
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/farmers/:id` | profile (frontend store shape) |
| PATCH | `/farmers/:id` | 🔒 update profile |
| GET | `/farmers/:id/tokens` | all tokens |
| GET | `/farmers/:id/history` | procurement history |
| GET | `/farmers/:id/notifications` | notification feed |
| GET | `/farmers` | 🔒 officer/admin — full roster |

### Centre
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/centers` | all centres + utilization + predictedWait |
| GET | `/centers/:id` | one centre |
| GET | `/centers/:id/schedules` | schedules for a centre |
| GET | `/centers/:id/farmers` | 🔒 officer/admin — booked farmers |
| GET | `/centers/:id/analytics` | centre analytics |
| PATCH | `/centers/:id/status` | 🔒 officer/admin |

### Schedules
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/schedules` | all schedules |
| GET | `/schedules/:centerId` | schedules for a centre |
| GET | `/schedules/recommended?centerId=` | deterministic best-slot |

### Tokens
| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/tokens` | 🔒 book a slot → generates `A127`, queue entry, wait estimate (transaction) |
| GET | `/tokens/:id` | token + farmer + centre + schedule + crop |
| DELETE | `/tokens/:id` | 🔒 soft cancel → status `CANCELLED`, queue re-numbered (transaction) |

### Queue
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/queue/:centerId` | live snapshot — poll every 5–10 s |
| POST | `/queue/:centerId/process-next` | 🔒 officer — finish current, call next (transaction) |
| POST | `/queue/:centerId/skip` | 🔒 officer — `{ tokenId }` → `SKIPPED` |
| POST | `/queue/:centerId/complete` | 🔒 officer — `{ tokenId }` → creates procurement + payment |
| POST | `/queue/:centerId/running` | 🔒 officer — `{ running }` pause/resume |

### Procurement
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/procurements?centerId=&farmerId=` | 🔒 list |
| POST | `/procurements` | 🔒 officer/admin — record a procurement |
| PATCH | `/procurements/:id/status` | 🔒 officer/admin |

### Notifications
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/notifications` / `/notifications/:farmerId` | feed |
| POST | `/notifications` | 🔒 create |
| PATCH | `/notifications/:id/read` | 🔒 mark read |
| POST | `/notifications/:farmerId/read-all` | 🔒 mark all read |

### Admin (🔒 ADMIN)
| Method | Path |
| ------ | ---- |
| GET | `/admin/overview` — totalCenters, totalFarmers, totalProcurement, totalPaymentValue, averageWaitingTime, activeCenters, overloadedCenters |
| GET | `/admin/centers` — monitoring table |
| GET | `/admin/farmers` · `/admin/procurements` · `/admin/payments` · `/admin/insights` |

### Analytics (Recharts-ready JSON)
`/analytics/farmers-served` · `/analytics/waiting-time` · `/analytics/center-utilization`
· `/analytics/crop-procurement` · `/analytics/peak-hours` · `/analytics/center/:centerId`

### AI (deterministic — isolated for a future Python ML swap)
| Method | Path | Returns |
| ------ | ---- | ------- |
| POST/GET | `/ai/waiting-time` | `{ predictedWait, confidence, factors }` |
| POST | `/ai/recommend-slot` | `{ recommendedSlot, estimatedWait, queueAhead, reasons, options }` |
| GET | `/ai/center-load` | per-centre `LOW/NORMAL/HIGH` + predicted wait |
| GET | `/ai/load-balancing` | overloaded-centre redirect plan (or `null`) |
| POST | `/ai/load-balancing/apply` | 🔒 officer/admin — `{ recommendationId }` → moves load, notifies |

Wait formula: `estimatedWait = queueAhead × avgProcessingTime ÷ activeCounters`,
adjusted for congestion, capacity pressure and peak hours.

### Demo mode (🔒 officer/admin — mutates real DB state)
| Method | Path | Effect |
| ------ | ---- | ------ |
| POST | `/demo/high-demand` | Amer → queue 75, status `OVERLOADED`, auto-creates AI recommendation |
| POST | `/demo/queue-reduction` | all centre queues drop ~60 % |
| POST | `/demo/schedule-change` | demo farmer's 11:30 slot → 1:00, notification |
| POST | `/demo/process-token` | advance the primary centre's queue by one |
| POST | `/demo/reset` | restore the seeded state |

---

## Response format

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "message": "Human readable error", "errors": { /* zod field errors, optional */ } }
```

HTTP codes: `400` validation · `401` no/invalid token · `403` wrong role ·
`404` not found · `409` conflict (slot full, duplicate, already applied) · `500` unexpected.

---

## Transactions

`prisma.$transaction` wraps every multi-step mutation so the queue can never be
left inconsistent: **token creation**, **cancellation**, **process-next**, **skip**,
**complete → procurement + payment**, **load-balancing apply**, **demo reset**.

---

## Notes

- `bcryptjs` is used instead of the native `bcrypt` (pure-JS, no build step) — same API.
- The frontend still runs on its mock services. The api layer that calls this backend
  lives in `../src/services/api/*`; set `VITE_USE_BACKEND=true` in the frontend `.env`
  to switch over (it falls back to mocks if the backend is unreachable).
- Next phase: replace `src/services/recommendationService.ts` with calls to a Python
  ML service. No other backend file changes — the endpoint contracts stay the same.
