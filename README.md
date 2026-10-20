# WanderPlan - Personalized AI Travel Itinerary Planner

A production-ready full-stack travel itinerary planner with **React + Vite + TypeScript** frontend, **Python FastAPI** backend, **Supabase PostgreSQL & Auth**, **Groq AI** generation, and **Unsplash** destination imagery.

---

## Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons, Vite. Hosted on **Vercel**.
- **Backend**: Python 3.10+, FastAPI, Pydantic, HTTPX, Uvicorn. Hosted on **Render**.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS), foreign key cascades, and Supabase Auth JWT identity verification.
- **AI Engine**: Groq AI API (`llama-3.3-70b-versatile`) with structured JSON mode, exponential backoff, rate-limit retries, and day/activity regeneration.
- **Imagery**: Unsplash API with verified photographer attribution, download tracking, and resilient high-fidelity fallbacks.

---

## Directory Structure

```text
├── .env.example               # Root configuration reference
├── .gitignore                  # Full secret & artifact protection
├── vercel.json                 # Vercel SPA routing and header rules
├── render.yaml                 # Render Blueprint web service definition
├── package.json                # Frontend & fullstack development scripts
├── server.ts                   # Express fullstack server with Vite middleware
├── supabase/
│   └── migrations/
│       └── 20261020000000_create_travel_planner_schema.sql # Idempotent SQL schema with RLS
├── backend/
│   ├── .env.example            # Backend environment template
│   ├── requirements.txt        # FastAPI, Pydantic, HTTPX, Pytest
│   ├── Dockerfile              # Production container build
│   ├── app/
│   │   ├── main.py             # FastAPI entry, CORS, lifespan
│   │   ├── config.py           # Environment settings & status checks
│   │   ├── schemas/            # Pydantic validation models
│   │   ├── services/
│   │   │   ├── groq_service.py     # Groq client with JSON retry logic
│   │   │   ├── unsplash_service.py # Unsplash client with attribution
│   │   │   └── supabase_service.py # Supabase Auth & PostgREST CRUD
│   │   └── routes/             # Health, trips, itinerary, images
│   └── tests/                  # 15 unit tests (unittest & pytest compatible)
└── src/
    ├── App.tsx                 # Core application controller
    ├── types/                  # TypeScript domain interfaces
    ├── context/AuthContext.tsx # Supabase Auth & Demo guest state
    ├── lib/api.ts              # Typed API communication client
    ├── lib/supabase.ts         # Supabase client initialization
    └── components/             # Production UI components
```

---

## 1. Local Setup Guide

### Windows (PowerShell)

```powershell
# 1. Clone your repository
git clone https://github.com/your-username/wanderplan.git
cd wanderplan

# 2. Frontend & Full-Stack Development
npm install
Copy-Item .env.example .env.local
npm run dev
# App will run at http://localhost:3000

# 3. Python FastAPI Backend (Standalone)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# API Docs will run at http://localhost:8000/docs
```

### macOS / Linux (Bash)

```bash
# 1. Clone repository
git clone https://github.com/your-username/wanderplan.git
cd wanderplan

# 2. Frontend & Full-Stack Development
npm install
cp .env.example .env.local
npm run dev

# 3. Python FastAPI Backend (Standalone)
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 2. Supabase Setup & SQL Migrations

1. Go to [Supabase](https://supabase.com) and create a project (e.g., `wanderplan-db`).
2. Navigate to **SQL Editor** -> **New Query**.
3. Copy the contents of `supabase/migrations/20261020000000_create_travel_planner_schema.sql` and run it.
   - This creates `profiles`, `trips`, `itinerary_days`, `activities`.
   - Enables **Row Level Security (RLS)** with user-isolated access.
   - Sets up automatic `updated_at` triggers and new-user profile hooks.
4. Navigate to **Project Settings** -> **API**:
   - Copy **Project URL** (`https://xyz.supabase.co`)
   - Copy **anon public key** (`eyJ...`)
   - Copy **service_role secret key** (save strictly on your backend)

---

## 3. Environment Variables Configuration

### Frontend (`.env.local` or Vercel Settings)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Render API Base URL (empty in local dev) | `https://wanderplan-api.onrender.com` |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGci...` |

### Backend (`backend/.env` or Render Settings)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq AI Key from console.groq.com | `gsk_...` |
| `GROQ_MODEL` | Configurable model identifier | `llama-3.3-70b-versatile` |
| `UNSPLASH_ACCESS_KEY` | Unsplash Developer Access Key | `abc...` |
| `SUPABASE_URL` | Supabase Project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGci...` |
| `FRONTEND_URL` | Deployed Vercel domain | `https://wanderplan.vercel.app` |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `http://localhost:3000,https://*.vercel.app` |

---

## 4. Running Tests

### Backend Unit & Integration Tests (15 Tests)

```bash
# In the project root:
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -p "test_*.py"
```

Or using pytest:
```bash
cd backend
pytest -v
```

### Frontend Typechecking & Build

```bash
npm run lint
npm run build
```

---

## 5. GitHub Repository Push

To push your codebase to your own GitHub repository:

```bash
# 1. Commit staged changes
git commit -m "feat: complete WanderPlan with Groq AI, Supabase, and Unsplash"

# 2. Create an empty repository on github.com (e.g. wanderplan)
# 3. Add remote and push:
git remote add origin https://github.com/<your-username>/wanderplan.git
git branch -M main
git push -u origin main
```

*(Note: Secrets, `.env`, and credentials are fully protected by `.gitignore` and are never committed).*

---

## 6. Vercel Deployment (Frontend)

1. Go to [Vercel](https://vercel.com) -> **Add New** -> **Project**.
2. Import your GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default or set to root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_BASE_URL`: Your deployed Render API URL (e.g., `https://wanderplan-api.onrender.com`).
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
5. Click **Deploy**.

---

## 7. Render Deployment (Backend)

### Option A: Using Render Blueprint (`render.yaml`)
1. In [Render Dashboard](https://dashboard.render.com), click **New** -> **Blueprint**.
2. Connect your GitHub repository. Render will automatically detect `render.yaml`.
3. Fill in the non-synced secrets (`GROQ_API_KEY`, `UNSPLASH_ACCESS_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`).
4. Click **Apply**.

### Option B: Manual Web Service Setup
1. In Render, select **New Web Service**.
2. Connect your repository.
3. Settings:
   - **Runtime**: `Python`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add the environment variables from Section 3.
5. Deploy.

---

## 8. Connecting & Verifying Production Flow

1. **Verify Backend Health**:
   Open `https://<your-render-api>.onrender.com/health` (should return `{"status":"ok"}`).
2. **Verify Interactive Documentation**:
   Open `https://<your-render-api>.onrender.com/docs` for Swagger UI.
3. **Verify Third-Party Status**:
   Open `https://<your-render-api>.onrender.com/api/services/status`.
4. **Connect CORS**:
   Ensure `FRONTEND_URL` on Render is set to your exact Vercel domain (`https://<your-app>.vercel.app`).
5. In the WanderPlan web app, click **Integrations** in the navbar to see live green checkmarks for all configured services!

---

## 9. Rollback & Troubleshooting

- **Supabase Authentication 401**: Ensure `SUPABASE_URL` has no trailing slashes and `SUPABASE_ANON_KEY` is not truncated.
- **Groq AI 429 Rate Limit**: The client automatically backs off with exponential retries. You can change `GROQ_MODEL` to another supported model in environment settings without altering code.
- **Unsplash 403 Rate Limit**: Free demo tier has 50 requests/hour. WanderPlan transparently serves curated high-resolution photography when limits are reached without breaking the user experience.
- **Render Cold Starts**: On free tiers, Render instances spin down after inactivity. WanderPlan includes a 45s backend timeout to accommodate cold starts gracefully.
