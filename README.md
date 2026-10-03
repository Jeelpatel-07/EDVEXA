# EDVEXA — Authentication and organization access

This review branch uses the team's tested FastAPI backend with the React integration fixes.
It replaces the alternate backend previously on main; main remains available for comparison.
Business modules such as events, finance, memberships and merchandise are later backend work.

## Backend

From backend/, create and activate a Python 3.12 or 3.13 virtual environment:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```
Set a generated JWT_SECRET_KEY and the real DATABASE_URL in your private .env.
Passwords/usernames with special characters in the database URL must be URL-encoded.
For this backend, use an empty PostgreSQL database and the Alembic chain, not the older SQL schema.

```powershell
python -m scripts.check_foundation
python -m alembic upgrade head
python -m scripts.bootstrap_admin --email your-admin@example.com --name "Your Name"
python -m uvicorn app.main:create_app --factory --reload --reload-dir app --host 127.0.0.1 --port 8000
```
The bootstrap command prompts for a password and does not install default credentials.
Configuration examples contain placeholders only. Never commit .env or a virtual environment.
Account verification/reset emails require SMTP configuration and the email worker.
See backend/README.md for the detailed contract and setup instructions.

## Frontend

From frontend/:
```powershell
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```
Open http://localhost:5173. Default API URL is http://localhost:8000/api.
Keep frontend/backend browser hostnames consistent for the refresh cookie.

## Review checks

```powershell
# In backend/ with the virtual environment active
python -m ruff check app tests scripts migrations/env.py migrations/versions
python -m pytest -q
python -m alembic upgrade head --sql

# In frontend/
npm run build
```
126 backend tests passed in the isolated verification environment. React production build
and browser authentication integration passed. Real PostgreSQL locking/concurrency and SMTP
delivery need verification with the team's services.
