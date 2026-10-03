# EDVEXA SYSTEM AUDIT REPORT (PRE-RECOVERY & POST-RECOVERY AUDIT)

**Audit Date**: October 3, 2026  
**Auditor**: Senior Full-Stack Recovery Engineer  
**Status**: Comprehensive Baseline Completed — Active Fixes Applied  

---

## 1. Project Tree Summary & Framework Versions

### Frontend Architecture
- **Root**: `frontend/`
- **Framework**: React 19.2.8, Vite 8.3.0, TailwindCSS 4.3.3, Vanilla JavaScript (ESNext).
- **Icons & Tooling**: `lucide-react`, `axios`, `jsqr`, `canvas-confetti`.
- **Startup**: `npm run dev` (runs on `http://localhost:5173`).
- **Production Build**: `npm run build` -> compiles to `dist/`.
- **Directory Structure**:
  - `src/api/`: Module-based HTTP clients wrapping standard Axios instance (`axios.js`).
  - `src/components/common/`: UI primitives (Badge, Button, Card, EmptyState, LoadingSpinner, Modal, StatsCard).
  - `src/components/layout/`: AppShell, PublicNavbar, Sidebar, PlatformShell.
  - `src/constants/permissions.js`: Role and permission constants.
  - `src/context/AuthContext.jsx`, `CartContext.jsx`.
  - `src/pages/auth/`: AcceptInvite, ForgotPassword, Login, Organizations, Register, ResetPassword, VerifyEmail.
  - `src/pages/personal/`: Dashboard, Membership, MembershipPlans, MembershipRenew, MyClaims, MyTickets, NewClaim, Notifications, OrderDetail, Orders, ProductDetail, Profile, Shop, TaskDetail, VolunteerTasks.
  - `src/pages/platform/`: PlatformAuditLogs, PlatformDashboard, PlatformOrganizations, PlatformUsers.
  - `src/pages/public/`: AnnouncementDetail, EventDetail, Home, PublicAnnouncements, PublicEvents.
  - `src/pages/staff/`: FinanceDashboard, FinanceReports, GateCheckIn, Inventory, LedgerEntries, ManageAnnouncements, ManageClaims, ManageEvents, ManageFundraisers, ManageMembers, ManageMembershipPlans, ManageOrders, ManageProducts, ManageUsers, NewAnnouncement, NewEvent, NewFundraiser, NewLedgerEntry, NewProduct, ReviewClaim, StaffOverview.

### Backend Architecture
- **Root**: `backend/`
- **Framework**: FastAPI (0.142.2), Uvicorn (0.54.0), SQLAlchemy 2.0.54, Psycopg 3.3.6 (driver `postgresql+psycopg`), Pydantic v2 (2.13.5), PyJWT (2.15.1), Passlib / direct Bcrypt (4.0.1), APScheduler (3.11.3), python-multipart (0.0.32), qrcode with Pillow (8.2 / 12.3.0).
- **Startup**: `uvicorn app.main:app --reload --port 8000` (LAN: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`).
- **Target App Structure**:
  - `app/main.py`: Application factory, CORS, exception handlers, health checks (`/health`, `/health/db`).
  - `app/config.py`: Environment configuration via Pydantic BaseSettings (`DATABASE_URL`, `JWT_SECRET`, etc.).
  - `app/db.py`: SQLAlchemy engine, `SessionLocal`, `get_db`.
  - `app/deps.py`: Auth pipeline (`verify JWT` -> `user ACTIVE` -> `tenant isolation` -> `term validation` -> `union permissions`).
  - `app/jobs/scheduler.py`: Background cron jobs (membership expiry, renewal reminders, expired reservation cleanup).
  - `app/routers/`: Auth, Platform, Org Admin, Workspace, Membership, Events, Tickets, Orders, Store, Announcements, Fundraisers, Finance, Public.
  - `app/schemas/`: Pydantic v2 schemas for all modules.
  - `app/services/`: AuthService, OrderService, TicketService, FinanceService, PricingService.
  - `database/`: `edvexa_complete.sql`, `edvexa_reset.sql`, `edvexa_seed.sql`.
  - `scripts/`: `seed.py`, `send_auth_emails.py`.

---

## 2. Backend Routers & Endpoints Audit

| Endpoint Group | Required Endpoints | Existing State in Legacy `backend/app` | Target Implementation in `work/recovery-backend` | Status / Gap | Fixed |
|---|---|---|---|---|---|
| **Health** | `GET /health`, `GET /health/db` | Only `GET /health` with static output | Full `database_diagnostic()` checking 42 tables, 6 roles, guard trigger, schema version | Legacy missing `GET /health/db` and DB checks | Fixed |
| **Authentication** | `POST /auth/register`, `/auth/login`, `/auth/select-org`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/resend-verification`, `/auth/accept-invite`, `/auth/change-password`, `GET /auth/verify-email`, `/auth/me`, `/auth/sessions` | Only split across `modules/accounts` and `modules/sessions` without `select-org` and unified `auth/me` | Fully implemented under `/api/v1/auth/*` with lockout, rotation, and live permission union | Missing endpoints and `/api/v1` prefix | Fixed |
| **Platform** | `GET/POST /platform/organizations`, `GET/PATCH .../{id}`, `POST .../suspend`, `POST .../activate`, `POST .../admins`, `GET /platform/stats`, `GET /platform/audit-logs`, `GET/PUT /platform/settings`, `GET /platform/users` | Partial in `modules/access/router.py` | Full implementation in `routers/platform.py`. Guarded: No endpoint can create PLATFORM_ADMIN. | Tenant isolation and full schema synchronization required | Fixed |
| **Org Admin** | Users list/search, invite, assign/revoke roles, suspend/reactivate, settings, terms CRUD, audit logs | Partial in `modules/access` | Full implementation in `routers/org_admin.py` and `routers/workspace.py` | All staff operations wired to database | Fixed |
| **Membership** | Plans CRUD, benefits CRUD, purchase, `/memberships/me`, `/memberships/verify/{qr_token}`, renew, members list | Absent in active backend | Full implementation in `routers/membership.py` | Missing entirely in active backend | Fixed |
| **Events & Tickets** | Events CRUD, publish/cancel, ticket types CRUD, `/events/{id}/report`, attendee list, `/tickets/me`, QR generation, `/tickets/scan`, `/tickets/{id}/refund` | Absent in active backend | Full implementation in `routers/events.py` and `routers/tickets.py` | Missing entirely in active backend | Fixed |
| **Store & Merch** | Products & variants CRUD, stock adjustments (`stock_movements`), low-stock list, pickup fulfillment | Absent in active backend | Full implementation in `routers/store.py` | Missing entirely in active backend | Fixed |
| **Orders & Payments** | `POST /orders` (server computes price), `POST /orders/{id}/pay` (mock gateway + idempotency), `GET /orders/me`, `GET /orders` | Absent in active backend | Full implementation in `routers/orders.py` | Missing entirely in active backend | Fixed |
| **Announcements** | CRUD, audience filtering, pinning, scheduled publish, notifications fan-out, `/notifications/me`, mark read | Absent in active backend | Full implementation in `routers/announcements.py` | Missing entirely in active backend | Fixed |
| **Fundraisers & Tasks** | Fundraiser CRUD + progress, task CRUD, assign, `/tasks/mine`, status updates, task comments | Absent in active backend | Full implementation in `routers/fundraisers.py` | Missing entirely in active backend | Fixed |
| **Finance** | Expense claims (receipt upload), approve/reject/reimburse, ledger entries, `/finance/summary`, CSV export | Absent in active backend | Full implementation in `routers/finance.py` | Missing entirely in active backend | Fixed |
| **Public** | `GET /public/organizations`, `/public/o/{slug}`, `/public/o/{slug}/events`, `/public/o/{slug}/announcements` | Absent in active backend | Full implementation in `routers/public.py` | Missing entirely in active backend | Fixed |

---

## 3. Frontend Pages & API Integration Audit

| Page Path | Component | API Module | Mock Data / Hardcoded Stubs? | Permission Guard Issue | Fixed |
|---|---|---|---|---|---|
| `/login` | `pages/auth/Login.jsx` | `useAuth()` (`authApi`) | Clean: Email + Password only | Redirect logic functional | Fixed |
| `/register` | `pages/auth/Register.jsx` | `authApi.register` | Clean: No role field in request | Clean; note needs visibility | Fixed |
| `/platform/*` | `pages/platform/*` | `platformApi.js` | None: Calls `/api/v1/platform/*` | Raw error console logging fixed | Fixed |
| `/app/dashboard` | `pages/personal/Dashboard.jsx` | `workspaceApi`, `eventApi`, `announcementApi` | None: Real API calls | Clean | Fixed |
| `/app/membership` | `pages/personal/Membership.jsx` | `membershipApi` | None: Real API calls | Clean | Fixed |
| `/app/tickets` | `pages/personal/MyTickets.jsx` | `ticketApi` | None: Real API calls | Clean | Fixed |
| `/app/shop` | `pages/personal/Shop.jsx` | `shopApi` | None: Real API calls | Clean | Fixed |
| `/app/cart`, `/checkout` | `pages/personal/Cart.jsx`, `Checkout.jsx` | `orderApi` | None: Real API calls | Clean | Fixed |
| `/app/orders` | `pages/personal/Orders.jsx` | `orderApi` | None: Real API calls | Clean | Fixed |
| `/app/tasks` | `pages/personal/VolunteerTasks.jsx`| `taskApi` | None: Real API calls | Guarded by `tasks.update_own` | Fixed |
| `/app/claims` | `pages/personal/MyClaims.jsx` | `claimApi` | None: Real API calls | Guarded by `expenses.submit` | Fixed |
| `/app/profile` | `pages/personal/Profile.jsx` | `authApi` | Was updating local state only | Connected to `/auth/change-password` & sessions | Fixed |
| `/app/manage/check-in` | `pages/staff/GateCheckIn.jsx` | `ticketApi.scanTicket` | None: Real QR / manual scan | Guard was checking `tickets.checkin` instead of `tickets.scan` | Fixed |
| `/app/manage/users` | `pages/staff/ManageUsers.jsx` | `userApi` | None: Real API calls | Guard was checking `users.manage` instead of `users.view` | Fixed |
| `/app/manage/claims` | `pages/staff/ManageClaims.jsx` | `claimApi` | None: Real API calls | Guarded by `expenses.approve` | Fixed |
| `/app/manage/finance` | `pages/staff/FinanceDashboard.jsx` | `financeApi` | None: Real API calls | Guard was checking `finance.manage` instead of `finance.view` | Fixed |
| `/app/manage/events` | `pages/staff/ManageEvents.jsx` | `eventApi` | None: Real API calls | Guard was checking `events.manage` instead of `events.create` / `events.update` | Fixed |
| `PlatformShell.jsx` | `components/layout/PlatformShell.jsx` | `useAuth()` | References unused `personaKey`, `loginAsPersona` | Cleaned up unused persona code | Fixed |

---

## 4. Database Configuration Audit

| Configuration Location | Value Found | Required Specification | Issue | Fixed |
|---|---|---|---|---|
| `backend/.env` | `DATABASE_URL=postgresql+psycopg://edvexa:replace-me@localhost:5432/edvexa` | Must be environment-driven; read `DATABASE_URL` only. | Unauthenticated default host/db | Fixed |
| `backend/app/core/config.py` | Used complex Redis, Fernet, and SMTP defaults | Simple, single-file environment config | Excessive unneeded dependencies | Fixed |
| `work/recovery-reference/backend/app/config.py` | Embedded fallback DB credentials in code | Must not hardcode fallbacks | Insecure fallback in reference file | Fixed |
| `frontend/src/api/axios.js:3` | `baseURL = import.meta.env.VITE_API_URL \|\| "http://localhost:8000/api"` | `http://localhost:8000/api/v1` | Missing `/v1` prefix | Fixed |
| `frontend/.env.example` | `VITE_API_URL=http://localhost:8000/api` | `VITE_API_URL=http://localhost:8000/api/v1` | Missing `/v1` prefix | Fixed |
| Active PostgreSQL Service | Port 5432 (system postgres) & Port 55432 (local instance `edvexa_recovery`) | Configurable via `DATABASE_URL` | Code must connect seamlessly via `DATABASE_URL` | Fixed |

---

## 5. Schema Drift Audit (Active 17-table ORM vs Target 42-table Schema)

| Target Schema Table | Columns / Constraints Required | Legacy Backend Model Status | Target SQL & Models | Fixed |
|---|---|---|---|---|
| `organizations` | `id, name, slug, status, join_code, member_number_prefix, currency, timezone, settings, created_by, created_at, updated_at` | Legacy columns differed | Complete in SQL and recovery models | Fixed |
| `subscription_plans` | `id, name, code, price, features, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `organization_subscriptions` | `id, organization_id, plan_id, status, valid_from, valid_until, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `platform_settings` | `key, value, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `org_sequences` | `organization_id, seq_key, year, next_value` | Missing | Exists in target schema | Fixed |
| `users` | `id, email, password_hash, full_name, phone, status, email_verified_at, failed_login_count, locked_until, last_login_at, last_org_id, is_seeded, created_via, must_change_password, created_at, updated_at` | Legacy used Argon2 only | Compatible with bcrypt and Argon2 | Fixed |
| `organization_users` | `id, organization_id, user_id, status, student_id, joined_via, created_at, updated_at` | Legacy columns differed | Exists in target schema | Fixed |
| `roles` | `id, code, name, scope, is_system, is_assignable_via_api, created_by_role, description, created_at, updated_at` (EXACTLY 6 ROWS) | Contained extra role definitions | Exactly 6 rows seeded | Fixed |
| `permissions` | `id, code, scope, description, created_at, updated_at` | Contained old permission strings | 38 permissions matching Section 3 | Fixed |
| `role_permissions` | `role_id, permission_id` | Mismatched mappings | Seeded strictly to Section 3 matrix | Fixed |
| `academic_terms` | `id, organization_id, name, start_date, end_date, is_current, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `user_roles` | `id, user_id, role_id, organization_id, term_id, valid_from, valid_to, assigned_by, revoked_at, created_at, updated_at` | Missing (had `organization_roles` & `platform_admins`) | Exists in target schema | Fixed |
| `invitations` | `id, organization_id, role_id, token_hash, invited_by, invited_by_role, expires_at, accepted_at, revoked_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `auth_tokens` | `id, user_id, purpose, token_hash, expires_at, used_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `refresh_tokens` | `id, user_id, token_hash, family_id, organization_id, user_agent, ip, last_used_at, expires_at, revoked_at, revoked_reason, created_at, updated_at` | Incompatible columns | Exists in target schema | Fixed |
| `login_attempts` | `id, ip, user_agent, successful, failure_reason, created_at` | Missing | Exists in target schema | Fixed |
| `membership_plans` | `id, organization_id, name, description, price, duration_days, is_active, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `membership_benefits`| `id, organization_id, plan_id, applies_to, discount_type, discount_value, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `memberships` | `id, organization_id, user_id, plan_id, member_number, status, payment_status, start_date, end_date, order_id, renewed_from_id, qr_token, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `fundraisers` | `id, organization_id, name, description, goal_amount, raised_amount, budget_amount, status, lead_user_id, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `events` | `id, organization_id, title, description, location, start_time, end_time, status, visibility, total_capacity, sales_open_at, sales_close_at, budget_amount, fundraiser_id, term_id, banner_url, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `tasks` | `id, organization_id, title, description, status, priority, due_date, completed_at, fundraiser_id, event_id, created_by, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `task_assignments` | `id, organization_id, task_id, user_id, assigned_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `task_comments` | `id, organization_id, task_id, user_id, comment, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `ticket_types` | `id, organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `products` | `id, organization_id, name, description, base_price, member_price, is_active, image_url, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `product_variants` | `id, organization_id, product_id, sku, size, color, stock_quantity, low_stock_threshold, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `orders` | `id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `order_items` | `id, organization_id, order_id, ticket_type_id, variant_id, plan_id, quantity, unit_price, was_member_price, fulfillment_status, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `tickets` | `id, organization_id, order_id, event_id, ticket_type_id, user_id, ticket_code, price_paid, was_member_price, status, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `check_ins` | `id, organization_id, ticket_id, scanned_by, membership_verified, method, checked_in_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `stock_movements` | `id, organization_id, variant_id, movement_type, quantity_change, reference_order_id, notes, performed_by, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `payments` | `id, organization_id, order_id, amount, method, status, provider_ref, idempotency_key, recorded_by, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `announcements` | `id, organization_id, author_id, title, content, category, audience, is_pinned, publish_at, published_at, event_id, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `notifications` | `id, organization_id, user_id, title, message, type, channel, status, metadata, read_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `mailing_subscribers`| `id, organization_id, subscribed_at, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `budget_categories` | `id, organization_id, name, type, description, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `term_budgets` | `id, organization_id, term_id, category_id, allocated_amount, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `expense_claims` | `id, organization_id, user_id, category_id, claim_number, title, description, amount, status, reviewed_by, reviewed_at, reject_reason, reimbursed_at, term_id, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `expense_receipts` | `id, organization_id, claim_id, file_name, file_url, file_size, mime_type, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `ledger_entries` | `id, organization_id, term_id, category_id, direction, amount, source_type, payment_id, expense_claim_id, description, reference_number, recorded_by, created_at, updated_at` | Missing | Exists in target schema | Fixed |
| `audit_logs` | `id, organization_id, actor_id, action, target_type, target_id, details, ip_address, created_at, updated_at` | Legacy columns differed | Exists in target schema | Fixed |
| **Views (7)** | `v_user_org_status, v_platform_stats, v_event_report, v_member_status, v_finance_summary, v_stock_levels, v_fundraiser_progress` | Missing entirely | All 7 views created | Fixed |
| **Triggers (7)** | `trg_guard_platform_admin`, `trg_protect_last_org_admin`, `trg_check_role_scope`, `trg_immutable_ledger`, `trg_immutable_audit`, updated_at triggers | Missing | All triggers and functions created | Fixed |

---

## 6. Role Architecture Problems

1. **Role Catalog Inconsistency**:
   - Locked Rule R1 requires EXACTLY 6 stored roles: `PLATFORM_ADMIN`, `ORG_ADMIN`, `TREASURER`, `EVENT_MANAGER`, `GATE_STAFF`, `VOLUNTEER`.
   - `MEMBER` and `GUEST` are derived and NEVER stored in the database.
   - Older attempts created separate tables (`platform_admins`) or tried to add `MEMBER` into role tables.
2. **Demo Logins & Persona Cards**:
   - `TRY EDVEXA DEMO` or persona switchers were present in earlier UI mockups.
   - All demo logins, combo role cards ("Admin + Treasurer"), and one-click logins are completely removed. Login is strictly email + password.
3. **Multi-Role Handling**:
   - A single user account can have multiple staff roles (e.g. VOLUNTEER + TREASURER) assigned by an ORG_ADMIN under the same email.
   - Permissions are the union of all active current-term roles.
4. **Registration Role Leak**:
   - Public `/register` must not accept any `role` or `roles` in request payload; if present, return HTTP 422 Unprocessable Entity.
5. **Platform Admin Protection**:
   - Exactly 2 PLATFORM_ADMIN users exist. Trigger `trg_guard_platform_admin` rejects any INSERT into `user_roles` with `role_id` of PLATFORM_ADMIN unless `app.allow_platform_admin_seed = 'on'`.
6. **Frontend Permission Naming Mismatch**:
   - `frontend/src/constants/permissions.js` had mismatched names (`users.manage`, `events.manage`, `tickets.checkin`, `finance.manage`), preventing valid roles from rendering their respective pages and sidebar links.

---

## 7. Ranked List of Bugs & Discrepancies

### Blocking Bugs
1. **[B1] API Prefix Mismatch**:
   - File: `backend/app/main.py:84-91`, `frontend/src/api/axios.js:3`, `frontend/.env.example:1`.
   - Issue: Backend mounted routes under `/api` while frontend and specification require `/api/v1`.
   - Status: Fixed.
2. **[B2] Missing 25+ Tables and 10+ Backend Routers**:
   - File: `backend/app/main.py`.
   - Issue: Commerce, finance, store, events, ticketing, announcements, fundraisers, and membership routers were absent from the active backend.
   - Status: Fixed (integrated full recovery backend routers and services).
3. **[B3] Missing Required Python Libraries in Environment**:
   - File: `backend/.venv`.
   - Issue: Missing `bcrypt`, `apscheduler`, `qrcode[pil]`, `python-multipart`.
   - Status: Fixed (installed all into virtual environment).

### Major Bugs
4. **[M1] Frontend Permission Constant Divergence**:
   - File: `frontend/src/constants/permissions.js:9-57`, `frontend/src/components/layout/Sidebar.jsx:81-158`, `frontend/src/App.jsx:190-250`.
   - Issue: Gate Staff, Event Manager, Treasurer, and Org Admin navigation guards checked non-existent permission strings (`tickets.checkin`, `events.manage`, `users.manage`).
   - Status: Fixed (mapped to exact DB permission strings).
5. **[M2] Health Diagnostics Missing**:
   - File: `backend/app/main.py`.
   - Issue: `/health/db` endpoint was missing, leaving DB connection and schema drift undiagnosed.
   - Status: Fixed (`/health/db` returns database name, server version, table count, role count, user count, schema version).
6. **[M3] Insecure Fallback Credentials in Config**:
   - File: `work/recovery-reference/backend/app/config.py:11`.
   - Issue: Hardcoded fallback database connection string.
   - Status: Fixed (environment-driven `DATABASE_URL` enforced via Pydantic).

### Minor Bugs
7. **[m1] Dead Code in PlatformShell**:
   - File: `frontend/src/components/layout/PlatformShell.jsx:23`.
   - Issue: Unused `personaKey` and `loginAsPersona` destructured from `useAuth()`.
   - Status: Fixed.
8. **[m2] Asynchronous Logout Navigation Race**:
   - File: `frontend/src/components/layout/PlatformShell.jsx:32`.
   - Issue: `logout()` was not awaited before navigating to `/login`.
   - Status: Fixed.
9. **[m3] Register Page Officer Note**:
   - File: `frontend/src/pages/auth/Register.jsx`.
   - Issue: Explicit note "Club officers are added by your organization admin." needed prominent placement.
   - Status: Fixed.
