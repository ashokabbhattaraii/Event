# EventNexus

A multi-tenant event management platform — a **Next.js** frontend and an **Express + MongoDB** backend, with attendee/organizer/admin roles, ticketing (QR), notifications, analytics, AI recommendations, and a chatbot.

- **Frontend:** Next.js 16, React 19, Tailwind, React Query → runs on **http://localhost:3000**
- **Backend:** Express, Mongoose, JWT auth → runs on **http://localhost:5000**

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18+ (tested on 22/26) | Native `fetch` is used, so Node 18+ is required |
| **pnpm** | 8+ | Install with `npm install -g pnpm` |
| **MongoDB** | any | Local (`mongodb://localhost:27017`) **or** a MongoDB Atlas connection string |

---

## Quick start

Open **two terminals** — one for the backend, one for the frontend.

### 1. Backend (`backend/`)

```bash
cd backend

# 1. install dependencies
pnpm i

# 2. create your env file, then edit MONGODB_URI + JWT_SECRET
cp .env.example .env

# 3. seed the database with demo data (users, events, tickets, notifications)
pnpm seed

# 4. run the API (dev mode with auto-reload)
pnpm dev
```

Backend is now live at **http://localhost:5000**.

> `pnpm dev` uses nodemon (auto-restart on save). Use `pnpm start` for a plain
> production run.

### 2. Frontend (`frontend/`)

```bash
cd frontend

# 1. install dependencies
pnpm i

# 2. (optional) point the app at the backend
cp .env.example .env.local   # defaults to http://localhost:5000/api

# 3. run the dev server
pnpm run dev
```

Frontend is now live at **http://localhost:3000**.

---

## Demo login credentials

After `pnpm seed`, these accounts exist (password is the same for all):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@eventnexus.dev` | `password123` |
| Organizer | `organizer@eventnexus.dev` | `password123` |
| Attendee | `attendee@eventnexus.dev` | `password123` |

Re-running `pnpm seed` **wipes and re-creates** all seeded data.

---

## Environment variables

### Backend — `backend/.env` (copy from `.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | API port (default `5000`) |
| `MONGODB_URI` | **yes** | Mongo connection string (local or Atlas) |
| `JWT_SECRET` | **yes** | Secret for signing session JWTs |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `7d`) |
| `QR_TOKEN_SECRET` | no | Separate secret for QR ticket tokens (falls back to `JWT_SECRET`) |
| `FRONTEND_URL` | no | Allowed CORS origin (default `http://localhost:3000`) |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | no | Optional, not currently used by the chatbot (which answers only from real DB data, deliberately with no LLM in the loop, for accuracy). Reserved for future AI features. |

### Frontend — `frontend/.env.local` (copy from `.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | no | Backend API base URL (default `http://localhost:5000/api`) |

---

## Scripts reference

**Backend** (`backend/`)

| Command | What it does |
|---------|--------------|
| `pnpm i` | Install dependencies |
| `pnpm seed` | Wipe + populate the database with demo data |
| `pnpm dev` | Run API with auto-reload (nodemon) |
| `pnpm start` | Run API without auto-reload |

**Frontend** (`frontend/`)

| Command | What it does |
|---------|--------------|
| `pnpm i` | Install dependencies |
| `pnpm run dev` | Run the Next.js dev server |
| `pnpm run build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm run lint` | Lint the project |

---

## Project structure

```
Event/
├── backend/          Express + MongoDB API
│   └── src/
│       ├── config/       db connection
│       ├── controllers/  route handlers
│       ├── middleware/    auth, tenant, rate-limit, validation
│       ├── models/        Mongoose schemas
│       ├── routes/        Express routers
│       ├── utils/         JWT, QR tokens, AI provider, attendance prediction
│       ├── seed.js        demo data seeder  (pnpm seed)
│       └── server.js      app entry point
│
└── frontend/         Next.js app
    └── app/          pages & routes
```
