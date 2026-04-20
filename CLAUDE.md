# CLAUDE.md — Underhaus AI

This file gives Claude full context and standing permissions for this project.
Read `PROJECT_BRIEF.md` for product vision, target user, and phase roadmap.
Read `memory/` for a running log of every session and change made.

---

## Permissions

Claude has standing permission to:

- Read, create, edit, and delete any file in this repo
- Install packages (`pip3`, `npm`) as needed
- Start and stop dev servers (backend on port 8001, frontend on port 5173)
- Create new routes, components, services, and modules
- Refactor code when it improves correctness or clarity
- Update memory files after every session (required — see Memory section below)

Do not:
- Commit or push to git without explicit user instruction
- Send requests to external APIs (Anthropic, MLS, etc.) without confirming the call is intentional
- Delete `.env` files — edit them in place
- Modify `PROJECT_BRIEF.md` without explicit instruction

---

## Stack

### Backend — FastAPI (Python)
- Entry point: `backend/main.py`
- Running on: `http://localhost:8001`
- Env vars: `backend/.env` (never commit secrets)
- Install deps: `pip3 install -r backend/requirements.txt`
- Start: `python3 -m uvicorn main:app --reload --port 8001` (run from `backend/`)

### Frontend — React + Vite + Tailwind
- Entry point: `frontend/src/main.jsx`
- API client: `frontend/src/api/client.js` — reads `VITE_API_URL` from `.env.local`
- Running on: `http://localhost:5173`
- Backend URL: `frontend/.env.local` → `VITE_API_URL=http://localhost:8001`
- Install deps: `npm install` (run from `frontend/`)
- Start: `npm run dev` (run from `frontend/`)

---

## Security Baseline

These rules apply to every file touched in this project:

1. **Secrets in env only.** No API keys, tokens, or credentials in source files. All secrets go in `.env` (backend) or `.env.local` (frontend). Both are gitignored.

2. **CORS locked to known origins.** `backend/main.py` allows only `localhost:5173` and `localhost:4173`. Never use `allow_origins=["*"]` in any environment.

3. **Input validation on all routes.** Every FastAPI route that accepts user input uses Pydantic models. No raw `dict` or untyped request bodies.

4. **No command injection.** Never pass user input to `subprocess`, `os.system`, or shell commands. Use Python libraries instead.

5. **No SQL injection.** Use parameterized queries or an ORM. Never format user input into raw SQL strings.

6. **No secrets in logs.** Never log API keys, tokens, passwords, or PII. Log IDs and statuses only.

7. **Dependency hygiene.** Pin versions in `requirements.txt` and `package.json` when moving to production. Don't install packages without a clear reason.

8. **Environment parity.** Anything that works in dev must work with env vars swapped — no hardcoded localhost URLs in source code (use env vars).

---

## Project Structure

```
UnderhausAI/
├── CLAUDE.md               ← this file
├── agent.md                ← agent architecture and task definitions
├── PROJECT_BRIEF.md        ← product vision, phases, brand, non-goals
├── memory/                 ← session logs (one file per work date)
│   └── YYYY-MM-DD.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env                ← gitignored
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   └── api/
    │       └── client.js
    ├── .env.local           ← gitignored
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Memory Protocol

After every session, Claude must update `memory/` with a dated file:

- Filename: `memory/YYYY-MM-DD.md`
- If the file for today already exists, append to it — do not create a duplicate
- Each entry should summarize: what was built or changed, why, and any decisions made
- Keep entries concise — a future agent should be able to read the full folder in under 5 minutes and understand the complete project history

This is not optional. Update memory before closing any session.
