# EDVEXA — Unified Student Organization Platform

EDVEXA is a multi-tenant Student Organization Platform built with **FastAPI** (Python 3.11+), **PostgreSQL 15+**, and **React 18 (Vite) + Tailwind CSS**. It provides collegiate governance, membership management, ticketing, merchandise orders, expense claims adjudication, double-entry ledger accounting, and Microsoft Word financial audit exports.

---

## 🚀 5-Minute Quick Start Guide

Follow these steps to run the complete EDVEXA system locally.

### System Requirements
* **Python 3.11+**
* **Node.js 18+** & **npm**
* **PostgreSQL 15+** (Local installation or Docker)

---

### Step 1: Database Setup

1. Open PostgreSQL `psql` or **pgAdmin 4** Query Tool and create the database:
   ```sql
   CREATE DATABASE edvexa_db;
   ```

2. Initialize the complete schema, tables, triggers, and baseline security:
   * **Via Command Line (PowerShell)**:
     ```powershell
     psql -U postgres -d edvexa_db -f backend\database\edvexa_complete.sql
     ```
   * **Via pgAdmin 4**:
     Open `backend/database/edvexa_complete.sql` in Query Tool and click **Execute (F5)**.

---

### Step 2: Seed Massive Production Data (Recommended)

To populate the database with rich test data across all scenarios (70 realistic users, 28 events, 26 merchandise products, 44 orders, 8 fundraisers, 39 tasks, 30 expense claims, and 55 double-entry ledger transactions):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\populate_massive_data.py
```
*(On macOS / Linux: use `source .venv/bin/activate`)*

---

### Step 3: Backend Configuration & Startup

1. In the `backend` folder, create your `.env` file:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Confirm the database connection string in `backend\.env`:
   ```ini
   DATABASE_URL=postgresql+psycopg://postgres:yourpassword@127.0.0.1:5432/edvexa_db
   JWT_SECRET=super-secret-jwt-key-minimum-32-chars-long-edvexa-auth
   JWT_ISSUER=edvexa
   ACCESS_TOKEN_MINUTES=15
   REFRESH_TOKEN_DAYS=7
   CORS_ORIGINS=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
   COOKIE_SECURE=false
   EMAIL_MODE=console
   APP_BASE_URL=http://localhost:5173
   PAYMENT_MODE=mock
   ```

3. Start the FastAPI server:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
   > FastAPI runs at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.

4. **Verify Health**:
   Visit `http://localhost:8000/health/db` in your browser. Expected response:
   ```json
   {
     "status": "ready",
     "database": "edvexa_db",
     "tables": 42,
     "roles": 6,
     "platform_admin_trigger": "present"
   }
   ```

---

### Step 4: Frontend Configuration & Startup

1. Open a new terminal in the `frontend` folder:
   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

2. Open **`http://localhost:5173`** (or `http://localhost:5174` if 5173 is in use).

---

## 👥 Demo Credentials for All 8 Roles

All accounts are pre-seeded and verify directly with bcrypt:

| Role | Email | Password | Responsibilities & Test Scenarios |
| :--- | :--- | :--- | :--- |
| **ORG_ADMIN** | `admin1@edvexa.edu` | `OrgAdmin@Edv#1` | Full organization governance, committee appointments, and store management. |
| **TREASURER** | `treasurer1@edvexa.edu` | `Treasure@Edv#1` | Treasury dashboard, expense claims audit & reimbursement payout, ledger entries, and Word audit report export. |
| **EVENT_MANAGER** | `events1@edvexa.edu` | `EventMgr@Edv#1` | Create & manage events, ticket types, merchandise products, and fundraisers. |
| **GATE_STAFF** | `gate1@edvexa.edu` | `GateStaff@Edv#1` | High-speed QR/ticket scanner for door check-ins with anti-double-entry checks. |
| **VOLUNTEER** | `volunteer1@edvexa.edu` | `Volunteer@Edv#1` | Assigned volunteer shifts/tasks and expense reimbursement submission with receipt uploads. |
| **MEMBER** | `member1@edvexa.edu` | `Member@Edv#1` | Gold Annual Member pass, discounted tickets, store orders, and member discussions. |
| **GUEST** | `guest1@edvexa.edu` | `Guest@Edv#1` | Registered student exploring public events, membership upgrades, and store products. |
| **PLATFORM_ADMIN** | `platform1@edvexa.app` | `Plat@Edvexa#1` | Multi-tenant organization onboarding and global platform metrics (`/platform`). |

---

## 💡 Key Architectural Features & Modules

### 1. Treasury, Claims & Financial Governance
* **Expense Adjudication Lifecycle**:
  * **SUBMITTED**: Claimant uploads proof of purchase (`.pdf`, `.png`, `.jpg`). Treasurer reviews purpose and receipt.
  * **APPROVED**: Treasurer approves the audit. The claim is queued for reimbursement.
  * **REIMBURSED**: Treasurer clicks **Issue Payout & Log to Ledger**. Automatically posts a debit transaction to the double-entry general ledger.
* **Microsoft Word (.doc) Audit Export**:
  * Navigate to **Finance & Ledger → Reports** (`/app/manage/reports`).
  * Click **Export as Word (.doc)** to instantly download the official collegiate financial statement formatted natively for Microsoft Word, complete with monthly breakdown tables, category distribution, and auditor compliance certification signatures.

### 2. Orders & Merchandise Fulfillment Desk
* Navigate to **Staff → Orders** (`/app/manage/orders`).
* Merchandise collection desk view allows desk operators to filter orders awaiting pickup and click **Mark Picked Up** with instant real-time status synchronization.

### 3. Events & Gate Check-in
* High-speed gate check-in at `/app/scanner`.
* Validates ticket authenticity, enforces tenant boundary isolation, and prevents duplicate check-in reuse.

### 4. Database Security & Ledger Immutability
* **`fn_immutable_ledger`**: PostgreSQL trigger strictly blocks any `UPDATE` or `DELETE` statements on the `ledger_entries` table. Financial transactions can only be corrected via adjusting entries.
* **`fn_protect_last_org_admin`**: PostgreSQL trigger prevents accidental removal or lockout of the last remaining Organization Administrator.
* **Price Tampering Protection**: Order amounts are calculated authoritatively on the server from the product database, rejecting any client-side modified prices.

---

## 🧪 Testing & Quality Assurance

### Run the Backend Acceptance Suite
The repository includes an automated 17-point end-to-end acceptance test suite covering authentication, permissions matrix, multi-tenant isolation, concurrency seat reservation, immutable triggers, and account lockout:

```powershell
cd backend
python smoke_test.py
```
**Expected Output**: `ALL 17 TEST SECTIONS PASSED WITH 100% SUCCESS!`

### Run Frontend Production Build Validation
```powershell
cd frontend
npm run build
```
Builds the production bundle cleanly with zero linting or syntax errors.

---

## 🛠️ Common Troubleshooting

* **PostgreSQL Connection Refused (`10061` / `ECONNREFUSED`)**:
  * Verify that the PostgreSQL service is active in Windows Services (`services.msc`) or run `Get-Service postgresql*`.
  * Ensure the port in `backend\.env` matches your PostgreSQL port (default `5432` or `55432`).
* **Frontend Blank Screen**:
  * Ensure all dependencies are installed with `npm install` inside `frontend`.
  * Check browser console (F12) to verify `VITE_API_URL` is pointing to `http://localhost:8000/api/v1`.
* **CORS Errors**:
  * The backend supports regex-based CORS matching any localhost or 127.0.0.1 port (e.g. 5173, 5174, 5175). Ensure `backend/.env` is loaded.
