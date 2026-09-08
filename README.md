# 🌾 KisanSetu AI

**Less Waiting. Smarter Procurement.**

An AI-powered agricultural procurement assistant that predicts waiting times,
recommends the best visit slots and keeps farmers informed. Three dashboards —
**Farmer**, **Procurement Centre**, **Admin** — backed by one database.

---

## Architecture

```
Farmer Dashboard ─┐
Centre Dashboard ─┼─▶  React + Vite (this repo /src)
Admin Dashboard  ─┘         │
                            │  src/services/api/*   (VITE_USE_BACKEND=true)
                            ▼
                    REST API  ──▶  Node.js + Express + TypeScript   (/backend)
                            │
                            ▼
                         Prisma  ──▶  PostgreSQL / Supabase
                            │
                            ▼
                    Deterministic AI service  (→ Python ML service, next phase)
```

- **Frontend** still runs standalone on mock data. Point it at the backend by
  setting `VITE_USE_BACKEND=true` — it falls back to mocks if the API is down.
- **Backend** (`/backend`) is the single source of truth: all three dashboards
  read and write the same PostgreSQL database. See [backend/README.md](backend/README.md).
- **AI** is deterministic today (`backend/src/services/recommendationService.ts`),
  isolated so a Python ML service can replace it without touching any other file.

---

## Tech stack

| Concern | Frontend | Backend |
| ------- | -------- | ------- |
| Language | TypeScript | TypeScript |
| Core | React 18 + Vite 5 | Node.js + Express 4 |
| Data | Zustand (+ `persist`) | Prisma → PostgreSQL / Supabase |
| Styling | Tailwind CSS 3 | — |
| Routing | React Router 6 | Express routers |
| Charts | Recharts | — |
| QR codes | qrcode.react | — |
| Validation | — | Zod |
| Auth | JWT in localStorage | JWT (`jsonwebtoken`) + bcrypt |
| Security | — | Helmet + CORS |
| Docs | — | Swagger UI at `/api/docs` |
| i18n | EN / HI / Hinglish | `language` per user |

---

## Run both

```bash
# 1. Backend  (needs PostgreSQL — see backend/README.md for Supabase or Docker)
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev            # http://localhost:5000/api   (docs: /api/docs)

# 2. Frontend  (new terminal, repo root)
cd ..
npm install
echo "VITE_USE_BACKEND=true"        >> .env
echo "VITE_API_BASE_URL=http://localhost:5000/api" >> .env
npm run dev            # http://localhost:5173
```

Leave `VITE_USE_BACKEND` unset to run the frontend fully offline on mock data.

**Demo logins** (password `demo1234`): `farmer@demo.com`, `officer@demo.com`, `admin@demo.com`.

Verify the whole chain end-to-end:

```bash
cd backend && npm run test:api      # re-seeds + 66 HTTP assertions across the demo flow
```

---

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

Other scripts:

```bash
npm run build     # type-check + production build
npm run preview   # serve the production build
```

`.env` is optional — see `.env.example`. The app runs fully without it.

---

## The demo flow (works end-to-end)

1. **Landing page** → **I'm a Farmer**
2. **Onboarding** (5 steps) → pick **हिंदी** on step 2
3. **Farmer Dashboard** — shows the current crowd (queue 72 / wait 128 min)
4. **AI Recommended Visit Time** card → recommends **11:30 AM** (wait 35 min)
5. Click **Book This Slot** → generates **TOKEN A127**
6. **My Token** → digital token with **QR code**, Share, Cancel
7. **Live Queue** → tokens advance `A113 → A114 → A115 …` every 5–10 s
   (Pause / Resume simulation)
8. Switch to **Officer → Dashboard**
9. **Demo Controls → Simulate High Demand** → *Amer Procurement Center*
   becomes overloaded (queue 18 → 75, wait 35 → 128 min)
10. **AI Recommendation** panel appears → **Apply Recommendation**
11. Amer's queue drops, Sanganer's rises, wait times recalculate,
    success toast: *"AI recommendation applied successfully."*
12. Back on the **Farmer → Notifications**, the schedule-change / demand
    notifications are waiting.

---

## Routes

| Path | Screen |
| ---- | ------ |
| `/` | Landing page |
| `/farmer/onboarding` | 5-step onboarding |
| `/farmer/dashboard` | Farmer dashboard + AI recommended slot |
| `/farmer/procurement` | Schedule, stats, "Before You Visit" checklist |
| `/farmer/token` | Digital token + QR |
| `/farmer/queue` | Simulated live queue |
| `/farmer/assistant` | KisanSetu Saathi chatbot |
| `/farmer/history` | Past procurement records |
| `/farmer/notifications` | Notification centre |
| `/farmer/profile` | Profile |
| `/officer/dashboard` | Procurement Command Center + demo controls |
| `/officer/centers` | Center monitoring + map |
| `/officer/queue` | Queue management (Process / Skip / Complete / Pause) |
| `/officer/recommendations` | AI load balancing + insights |
| `/officer/farmers` | Registered farmers (search) |
| `/officer/analytics` | Recharts analytics |
| `/officer/notifications` | Notification centre |
| `/admin/dashboard` | State-wide admin overview |

---

## Project structure

```
src/
├── main.tsx                 # entry, Router
├── App.tsx                  # route table
├── index.css               # Tailwind + component classes + field texture
├── types/                  # all domain interfaces (Farmer, Token, Queue, …)
├── data/                   # ⬅ ALL mock data lives here, nowhere else
│   ├── centers.ts
│   ├── farmers.ts
│   ├── tokens.ts           # procurement history
│   ├── notifications.ts
│   ├── schedules.ts        # today's schedule + candidate AI slots
│   ├── queue.ts
│   └── analytics.ts
├── services/              # ⬅ mock "backend" — swap these for real APIs
│   ├── mockAI.ts           # recommendBestSlot(), predictWaitingTime(),
│   │                       #   getCenterStatus(), computeLoadBalancing()
│   ├── mockQueue.ts        # advanceQueue(), processNextToken(), surgeQueue()
│   ├── mockAssistant.ts    # getAssistantResponse()
│   └── mockNotifications.ts# notify* factories
├── store/
│   └── appStore.ts         # Zustand store (persisted to localStorage)
├── i18n/
│   ├── index.ts            # createTranslator(), useT(), LANGUAGES registry
│   ├── en.ts               # full schema (source of truth + fallback)
│   ├── hi.ts               # हिंदी (partial → falls back to en)
│   └── hinglish.ts         # Hinglish (partial → falls back to en)
├── components/
│   ├── common/             # StatusBadge, MetricCard, ProgressBar,
│   │                       #   LanguageSelector, DemoBadge, Toast, …
│   ├── layout/             # FarmerLayout, OfficerLayout
│   └── officer/            # CenterCard, CenterMap, DemoControls,
│                           #   AIRecommendationPanel
└── pages/
    ├── Landing.tsx
    ├── farmer/*
    ├── officer/*
    └── admin/*
```

---

## Backend integration — connected

The frontend now runs against the real backend when **`VITE_USE_BACKEND=true`**
(set in `.env`). It still falls back to the mock services automatically if the
API is unreachable — a thin status strip appears with a **Try Again** button,
and no screen ever blank-screens.

**How it is wired (data/service layer only — no UI redesign):**

- **Auth** — the layouts silently log in the matching demo account
  (`farmer@demo.com` / `officer@demo.com` / `admin@demo.com`, `demo1234`) via
  `POST /api/auth/login`; `apiClient` attaches `Authorization: Bearer <jwt>`
  (stored in `localStorage`, never hard-coded).
- **Store** — `src/store/appStore.ts` is the single integration point. Every
  existing action keeps its name; internally it calls the backend and maps the
  response through `src/services/adapters.ts` onto the existing frontend types
  (so components are untouched), or runs the old mock logic when offline.
- **Adapters** — `src/services/adapters.ts` maps backend DTOs (cuid ids, ISO
  dates, backend enums) to the frontend's slug-based types.

| Frontend mock | now calls | REST endpoint |
| ------------- | --------- | ------------- |
| `getRecommendedSlot()` (was `mockAI.recommendBestSlot`) | `centerApi.recommendedSchedule()` | `GET /api/schedules/recommended` |
| `mockAI.predictWaitingTime()` | `aiApi.waitingTime()` | `POST /api/ai/waiting-time` |
| `mockAI.getCenterStatus()` | `centerApi.list()` / `aiApi.centerLoad()` | `GET /api/centers`, `GET /api/ai/center-load` |
| `mockAI.computeLoadBalancing()` | `aiApi.loadBalancing()` | `GET /api/ai/load-balancing` |
| `store.bookSlot()` | `tokenApi.create()` | `POST /api/tokens` → real `TOKEN A127` |
| `store.cancelToken()` | `tokenApi.cancel()` | `DELETE /api/tokens/:id` |
| `store.tickFarmerQueue()` (5–10 s poll) | `queueApi.get()` | `GET /api/queue/:centerId` |
| `store.officerProcessNext/Skip/MarkComplete()` | `queueApi.processNext/skip/complete()` | `POST /api/queue/:centerId/*` |
| `store.applyRecommendation()` | `aiApi.applyLoadBalancing()` | `POST /api/ai/load-balancing/apply` |
| `store.simulate* / resetDemo()` | `demoApi.*` | `POST /api/demo/*` |
| `mockNotifications.*` | `notificationApi.*` | `/api/notifications` |
| admin dashboard, officer analytics/farmers, farmer history | `adminApi.* / analyticsApi.* / farmerApi.*` | `/api/admin/*`, `/api/analytics/*`, `/api/farmers/:id/history` |

Helper: `withBackend(live, fallback)` and the `useBackendResource()` hook keep
every page working with or without the backend.

**Offline / demo mode:** set `VITE_USE_BACKEND=false` (or stop the backend) and
the app runs exactly as before on mock data.

---

## Language system

- Three languages: **English**, **हिंदी**, **Hinglish**.
- `en.ts` is the complete schema; `hi.ts` / `hinglish.ts` are partial and
  fall back key-by-key to English, so nothing is ever blank.
- Selected language is stored in `localStorage` (via the persisted store)
  and is available from the navbar on every screen. Changing it updates all
  visible text immediately.
- Adding e.g. Marathi = add `{ code: 'mr', … }` to `LANGUAGES` and a
  `mr.ts` file. No other change.

---

## Notes on "demo realness"

- **Live queue** advances on a timer (`setTimeout` 5–10 s) — a stand-in for
  a WebSocket feed. Pause/Resume controls included.
- **Demo Mode** badge is always visible on officer/admin screens.
- **Demo Controls** (officer): Simulate High Demand / Queue Reduction /
  Schedule Change / Process Next Token / Reset Demo — all mutate the shared
  store so the change is visible across farmer and officer views.
- All dashboards that show aggregate figures carry a
  *"Prototype / simulated data"* note.
