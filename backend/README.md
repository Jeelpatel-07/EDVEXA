# EDVEXA Backend

FastAPI multi-tenant backend with PostgreSQL, SQLAlchemy, Pydantic v2, PyJWT, and APScheduler.

## Quick Start
1. Setup PostgreSQL database:
   ```sql
   CREATE DATABASE edvexa_db;
   ```
2. Execute `database/edvexa_complete.sql` top-to-bottom.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure credentials.
5. Run tests:
   ```bash
   python smoke_test.py
   ```
6. Start development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
Interactive API documentation: `http://localhost:8000/docs`
