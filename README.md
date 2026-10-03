# EDVEXA — Multi-Tenant Student Organization SaaS

EDVEXA is a multi-tenant student organization platform that manages events, ticketing, member dues, merchandise catalogs, volunteer fundraisers, and financial ledgers.

---

## 🚀 Quick Start Guide

### 1. Database Setup
Ensure PostgreSQL 14+ is running with superuser access.
```sql
CREATE DATABASE edvexa_db;
```
Open **pgAdmin Query Tool** (or `psql -d edvexa_db`) on `edvexa_db`.
Open [`backend/database/edvexa_complete.sql`](backend/database/edvexa_complete.sql) and execute the entire script from top to bottom in one run.
> All tables, constraints, composite foreign keys, PostgreSQL functions, immutable triggers, and seed data (organizations, academic terms, products, events, and 16 user credentials) are populated immediately.
> To cleanly reset or wipe the schema at any point, execute [`backend/database/edvexa_reset.sql`](backend/database/edvexa_reset.sql).

---

### 2. Backend Setup
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
   Verify `DATABASE_URL` matches your local PostgreSQL credentials:
   ```env
   DATABASE_URL=postgresql+psycopg://postgres:pgsql@21@localhost:5432/edvexa_db
   JWT_SECRET=edvexa-super-secure-jwt-secret-key-32-chars-long-2026
   ACCESS_TOKEN_MINUTES=15
   REFRESH_TOKEN_DAYS=7
   CORS_ORIGINS=["http://localhost:5173"]
   COOKIE_SECURE=false
   EMAIL_MODE=console
   APP_BASE_URL=http://localhost:5173
   PAYMENT_MODE=mock
   ```
3. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Interactive OpenAPI documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 3. Frontend Setup
1. Open a terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Access the web app at [http://localhost:5173](http://localhost:5173).

---

### 4. Running the Smoke & Acceptance Test Suite
The acceptance test suite validates all 16 credentials, permission matrices, 403 access controls, 422 role rejection, and end-to-end data flows F1 through F10.

From `backend/`:
```bash
python smoke_test.py
# OR
pytest tests/test_smoke.py
```

---

## 🔑 Seeded Credentials (16 Pre-Configured Accounts)

All accounts are pre-seeded, active, and email-verified. Passwords use bcrypt cost factor 12.

| Role | Email | Password | Organization | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PLATFORM_ADMIN** | platform1@edvexa.app | `Plat@Edvexa#1` | *(none, platform)* | Seed-only platform governor |
| **PLATFORM_ADMIN** | platform2@edvexa.app | `Plat@Edvexa#2` | *(none, platform)* | Seed-only platform governor |
| **ORG_ADMIN** | admin1@edvexa.edu | `OrgAdmin@Edv#1` | EDVEXA Student Association | Full club governance & role assignment |
| **ORG_ADMIN** | admin2@abcsports.edu | `OrgAdmin@Abc#2` | ABC Sports Club | Multi-tenant isolation demo admin |
| **TREASURER** | treasurer1@edvexa.edu | `Treasure@Edv#1` | EDVEXA Student Association | Full financial ledger, claim review & payouts |
| **TREASURER** | treasurer2@edvexa.edu | `Treasure@Edv#2` | EDVEXA Student Association | Secondary treasury auditor |
| **EVENT_MANAGER** | events1@edvexa.edu | `EventMgr@Edv#1` | EDVEXA Student Association | Events, tickets, store, read-only finance |
| **EVENT_MANAGER** | events2@edvexa.edu | `EventMgr@Edv#2` | EDVEXA Student Association | Secondary event coordinator |
| **GATE_STAFF** | gate1@edvexa.edu | `GateStaff@Edv#1` | EDVEXA Student Association | Rapid door check-in & QR scanner only |
| **GATE_STAFF** | gate2@edvexa.edu | `GateStaff@Edv#2` | EDVEXA Student Association | Secondary door gate staff |
| **VOLUNTEER** | volunteer1@edvexa.edu | `Volunteer@Edv#1` | EDVEXA Student Association | Task updates & expense submission |
| **VOLUNTEER** | volunteer2@edvexa.edu | `Volunteer@Edv#2` | EDVEXA Student Association | Task updates & expense submission |
| **MEMBER** | member1@edvexa.edu | `Member@Edv#1` | EDVEXA Student Association | Active Annual Gold Pass (expires 2026-12-31) |
| **MEMBER** | member2@edvexa.edu | `Member@Edv#2` | EDVEXA Student Association | Active Semester Pass (expiring in 15 days) |
| **GUEST** | guest1@edvexa.edu | `Guest@Edv#1` | EDVEXA Student Association | Registered student without paid membership |
| **GUEST** | guest2@edvexa.edu | `Guest@Edv#2` | EDVEXA Student Association | Registered student without paid membership |

---

## 🏛️ Core Architecture & Governance

1. **Role Governance (R1–R3)**:
   - Exactly 6 stored roles (`PLATFORM_ADMIN`, `ORG_ADMIN`, `TREASURER`, `EVENT_MANAGER`, `GATE_STAFF`, `VOLUNTEER`).
   - 2 derived roles (`MEMBER` and `GUEST`) computed dynamically by `fn_is_member` from active paid memberships.
   - `PLATFORM_ADMIN` is seed-only. Creation is blocked at API, service, and database trigger levels (`guard_platform_admin`).
   - `ORG_ADMIN` can only assign staff roles (`TREASURER`, `EVENT_MANAGER`, `GATE_STAFF`, `VOLUNTEER`).
2. **Public Registration (R4)**:
   - Self-signup creates `GUEST` accounts. Any request containing `role` or `roles` is rejected with `422 Unprocessable Entity`.
3. **No Mock Personas (R5)**:
   - Login uses standard email and password authentication. All mock persona cards, demo one-click buttons, and fake combined cards have been permanently removed.
4. **Multi-Role Union (R6)**:
   - A single account/email holds multiple roles. The backend `fn_user_permissions` unions permissions across all assigned roles for the active term.
5. **Tenant Isolation (R7)**:
   - All tenant rows require `organization_id`. High-value relations enforce composite foreign keys. Cross-tenant access attempts return `403 Forbidden` or `404 Not Found`.
6. **Immutable Financial Records**:
   - Ledger entries and audit logs are strictly append-only, enforced by PostgreSQL database triggers preventing `UPDATE` and `DELETE`.
