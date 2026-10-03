# EDVEXA backend — Authentication and organization access

Part 1 provides shared infrastructure. Part 2 implements registration, email verification,
resending verification, forgot password and password reset. Part 3 implements login and refresh sessions.
Part 4 adds organization selection, scoped roles, platform administration and audit logs.
The teammate frontend is now available in D:/EDVEXA/frontend and uses this backend.

## Setup and run

From an activated PowerShell terminal in D:/EDVEXA/backend:

```powershell
python -m pip install -e ".[dev]"
python -m uvicorn app.main:create_app --factory --reload --reload-dir app --host 127.0.0.1 --port 8000
```

Keep your working .env. New account settings have safe development defaults; .env.example
documents them. Only copy the example when creating a new environment, then generate
JWT_SECRET_KEY using Python secrets.token_urlsafe(48). Never commit or share .env secrets.

- Swagger: http://127.0.0.1:8000/docs
- Liveness: http://127.0.0.1:8000/api/health/live
- Database connectivity: http://127.0.0.1:8000/api/health/ready

The server starts without opening a database connection. Account operations require
PostgreSQL and the account migration. There is no fake registration or in-memory production
storage. Until connected, database-backed requests return 503.

## Verification (no PostgreSQL or real SMTP needed)

```powershell
python -m pip check
python -m ruff check app tests scripts migrations/env.py migrations/versions
python -m pytest -q
python -m alembic heads
python -m alembic upgrade head --sql
```

Latest migration head: 0003_access. The chain creates 17 tables, including accounts, sessions and organization access.
These commands do not apply changes to PostgreSQL.
Verification completed in an isolated Python 3.12 environment: 126 tests passed, Ruff passed,
and PostgreSQL offline migration SQL generated successfully. The existing Starlette
HTTPX deprecation warning is non-blocking. The migration upgrade/downgrade and metadata
comparison are also tested on SQLite. PostgreSQL locking/concurrency and live SMTP remain
to be verified when those services are configured.

## Account module: only the necessary files

| File | Purpose |
| --- | --- |
| app/modules/accounts/models.py | Global users, hashed verification/reset tokens, email outbox |
| app/modules/accounts/schemas.py | Pydantic inputs and safe UserRead for Part 3 |
| app/modules/accounts/service.py | Transactional account workflows, no independent commits |
| app/modules/accounts/router.py | Five endpoints and IP/email rate limits |
| app/modules/accounts/email.py | Encrypted email queue, SMTP transport, delivery/retry batch |
| app/modules/accounts/__init__.py | Python package marker |
| migrations/versions/0001_accounts.py | One schema revision |
| scripts/send_auth_emails.py | One-shot/polling email worker |
| tests/test_accounts.py | Flow, security, rollback, SMTP and migration checks |

Existing config.py, main.py, model_registry.py, pyproject.toml and .env.example were updated.
The existing configuration test was updated for the new production email-key requirement.
No additional project virtual environment, scratch files or documentation folder was added.

## React API contract

Every endpoint is POST with Content-Type: application/json. Success responses are
{"message": "..."}; failures use the existing error.code/message/request_id format.

| Endpoint | Request | Success |
| --- | --- | --- |
| /api/auth/register | full_name, email, password | 202 |
| /api/auth/verify-email | token | 200 |
| /api/auth/resend-verification | email | 202 |
| /api/auth/forgot-password | email | 202 |
| /api/auth/reset-password | token, new_password | 200 |

Example registration:

```json
{
  "full_name": "Student Person",
  "email": "student@example.com",
  "password": "a sufficiently long password"
}
```

Passwords must have 15–128 characters. Names are trimmed/collapsed, emails normalized,
and unknown fields (including roles or organization_id) rejected. Registration additionally
accepts optional join_code and student_id; a student ID requires a join code and is stored
on organization_users, not the global account. Joining never assigns a staff role.

Registration/resend/forgot return the same generic 202 message for eligible/ineligible
requests to avoid revealing account existence. It means accepted, not already delivered.
Duplicate registration does not overwrite the account or generate another email.

Verification/reset require an unexpired, single-use token. Invalid, expired, consumed,
or suspended-account links return 400 INVALID_TOKEN. Resend/forgot invalidate older tokens
and cancel unsent old messages. Only verified ACTIVE accounts can reset passwords.

Frontend link routes:
- /verify-email#token=...
- /reset-password#token=...

React reads the URL fragment, removes it from the address using history.replaceState,
keeps it temporarily in memory, and submits it in the POST body. It must not send tokens
to analytics or store them in localStorage. Verify/reset use explicit user actions rather
than a GET request so mail link scanning does not consume tokens.

Current IP limits: register/resend/forgot 10 requests per 15 minutes, verify/reset 20.
Email-based register/resend/forgot limits: 3 per address per 15 minutes.
429 includes Retry-After. Limit defaults are kept with their routes for team review.

## Connect PostgreSQL later

Once the database person provides the database and credentials:

1. Configure DATABASE_URL with postgresql+psycopg and URL-encoded credentials.
2. Run python -m alembic upgrade head.
3. Run python -m scripts.check_foundation.
4. Test account flows against PostgreSQL, including concurrent token consumption and signup.

No tables are created during app startup. The migration owns the schema; do not use
create_all in application code. It is used only for isolated unit tests.

## Configure email delivery

Add mail settings to .env (never paste credentials into chat):

```dotenv
FRONTEND_BASE_URL=http://localhost:5173
SMTP_HOST=your-mail-server
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_FROM_EMAIL=your-verified-sender@example.com
SMTP_USERNAME=your-mail-username
SMTP_PASSWORD=your-mail-password
```

Use SMTP_SECURITY=ssl and port 465 if required by the provider. Plain SMTP is permitted
only in development, for a local mail-capture service. Username/password must be configured
together or omitted for an unauthenticated local capture server.

After PostgreSQL and SMTP are configured, deliver a batch or run a separate polling terminal:

```powershell
python -m scripts.send_auth_emails --limit 20
python -m scripts.send_auth_emails --watch --interval 5
```

Do not run both commands together unless deliberately using multiple workers.
Emails are not sent during application startup or directly inside API requests.
Registration/token/email enqueueing commit together. Delivery retries with bounded
backoff; max attempts default to 5. Expired/cancelled messages are skipped and encrypted
payloads cleared after delivery or cancellation. Delivery is at least once: a crash
after SMTP accepts but before database commit may deliver the same link twice.
PostgreSQL skip-locked row selection coordinates workers; live coordination is not
established by SQLite tests.

Queued payloads use Fernet encryption. Development derives a separate-purpose key
from JWT_SECRET_KEY when no explicit email key is configured. Changing the signing
secret in that mode makes existing queued payloads undecryptable, so configure a
separate stable key before real use. Production requires it. Generate one:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Save the result as AUTH_EMAIL_ENCRYPTION_KEY in .env. Never log raw links or tokens.
Keep the email key backed up securely; rotating it requires handling pending payloads.

## Part 3 integration

UserRead is the safe profile response. Password reset changes password_hash and increments
User.credential_version in one transaction.

Part 3 must:
- Snapshot credential_version on every session; reject mismatches during access-token
  AND refresh checks.
- Set app.state.revoke_user_sessions to its revoke_user_sessions(db, user_id) function.
- The callback must not commit; account password change and revocation share a transaction.
- Require verified ACTIVE users for login, check live session status, and implement
  refresh rotation, logout and cookie CSRF/origin enforcement.

Part 2 has no login/session tables yet. Versioning is an integration contract, not a claim
that future session checks already exist.

## Production

Use HTTPS frontend URLs/origins, REFRESH_COOKIE_SECURE=true, shared Redis rate limiting,
a separate email encryption key, TLS SMTP and explicitly configured trusted proxies.
CORS does not replace CSRF checks. Account statuses are global; Part 4 organization
suspension must not suspend the global User or block access to other organizations.

## Documentation sources

- [FastAPI security](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Alembic tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [Fernet](https://cryptography.io/en/latest/fernet/)

## Part 3 — login and sessions

Part 3 adds app/modules/sessions/{models,schemas,service,dependencies,router}.py,
its package marker, one migration (0002_sessions), and tests/test_sessions.py.
No new runtime dependency or project environment was added.

| Endpoint | Input | Authentication / browser requirements |
| --- | --- | --- |
| POST /api/auth/login | email, password | Trusted Origin or same-origin Referer |
| POST /api/auth/refresh | No body | HttpOnly refresh cookie, trusted origin, X-CSRF-Token |
| GET /api/auth/csrf | No body | Refresh cookie and trusted origin; used after a page reload |
| POST /api/auth/logout | No body | Trusted origin; CSRF required when a recognized cookie is present |
| POST /api/auth/logout-all | No body | Bearer access token, revokes every session of that user |
| GET /api/auth/me | No body | Bearer access token |

Login/refresh return:
```json
{
  "access_token": "signed-access-jwt",
  "token_type": "bearer",
  "expires_in": 900,
  "csrf_token": "session-bound-csrf-token",
  "user": {
    "id": "user-uuid",
    "full_name": "Student Person",
    "email": "student@example.com",
    "status": "ACTIVE",
    "email_verified_at": "timestamp",
    "created_at": "timestamp"
  }
}
```

The raw refresh token appears only in the HttpOnly cookie, not response JSON.
Cookies are host-only, path /api/auth, with configured Secure and SameSite flags.
Access and CSRF tokens belong in React memory, not localStorage.

React connection:
1. Use Axios withCredentials=true (or fetch credentials='include') for login, CSRF,
   refresh and logout.
2. Keep access_token and csrf_token in memory. Send Authorization: Bearer ... on
   protected calls.
3. Send X-CSRF-Token on refresh/logout. On a page reload, GET /api/auth/csrf first,
   then POST /api/auth/refresh to restore the access token.
4. Share one refresh promise for simultaneous 401 responses and retry a request
   at most once. Coordinate refresh across tabs too (e.g. Web Locks), because
   replaying a consumed refresh token deliberately revokes that session.
5. Clear frontend authentication state on logout or terminal refresh 401.
6. Keep frontend/backend on the same hostname locally: localhost:5173 with
   localhost:8000, or 127.0.0.1:5173 with 127.0.0.1:8000 and a matching CORS_ORIGINS.
   Mixing localhost and 127.0.0.1 can prevent SameSite cookies from being sent.
7. Cross-site production setups need Secure HTTPS cookies with SameSite=none;
   browser third-party-cookie restrictions may still apply. A same-site deployment
   avoids that dependency.

Cookie routes intentionally reject missing Origin AND Referer. Browsers supply them;
CLI clients must include Origin: http://localhost:5173 (or another configured origin).
Same-origin Swagger Referer is accepted. Its bearer Authorize button works for /me
and /logout-all; copy the returned csrf_token into the documented X-CSRF-Token header
for refresh/logout. Configure trusted proxies so request scheme/Host reflect the API.

Every protected request checks user ACTIVE + verified, live session expiry/revocation,
and matching credential_version. Part 4 can use get_current_user as its dependency.
Organization suspension must remain separate from global account suspension.

Refresh expiry is absolute: each successor retains the original session expiry
(default 30 days), while access JWTs last 15 minutes. Refresh records keep only
SHA-256 token digests. Rotation consumes the old row and creates a unique successor.
Session/user row locks serialize refresh with login, reset and logout-all.
Replay revokes only the affected session and returns a committed 401 with cookie deletion.
Other valid sessions remain active. Password reset increments credential_version and
calls the registered revoke_user_sessions in the same database transaction.

Current login limits: 10/IP and 5/email per 15 minutes. Refresh and CSRF-bootstrap:
60/IP per minute. Logout: 30/IP per minute; logout-all: 10/user per minute.

## Part 3 checks

```powershell
python -m pip install -e ".[dev]"
python -m pytest -q
python -m ruff check app tests scripts migrations/env.py migrations/versions
python -m alembic heads
python -m alembic upgrade head --sql
```

Expected head: 0002_sessions. Apply python -m alembic upgrade head only after connecting
PostgreSQL. No live database has been changed during implementation.

Verified: 108 tests passed in the temporary Python 3.12 verification environment;
Ruff passed. Coverage includes login statuses, origin/CSRF denial, rotation/replay,
revocation, password reset integration, cookie flags and both migration/model schemas.
SQLite tests do not establish PostgreSQL locking under real concurrent connections.
Live PostgreSQL concurrency, browser SameSite behavior and SMTP delivery remain to
be checked when the database/frontend/mail services are connected.

[CSRF design reference](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## Connected first module (Part 4)

The existing account/session API stays at /api/auth. React now calls /api/auth/context
for the wrapped user, organization, organizations, roles, permissions and membership state.
The older /api/auth/me remains a safe bare-user response for existing callers.

- POST /auth/join-org: join_code, optional student_id. Joining creates participation only.
- POST /auth/select-org: organization_id. Selection belongs to the server session and survives refresh.
- POST /auth/accept-invite: token; new accounts also supply full_name and password.
  Existing accounts must sign in as the invited email; accepting never replaces their password.
- POST /auth/change-password: current_password, new_password. Revokes every device session.
- GET /auth/sessions: only the caller's live sessions, without token hashes.
- /platform/stats, /platform/organizations, /platform/users, /platform/admins and
  /platform/audit-logs serve the existing platform pages.
- /orgs/{organization_id}/users and user roles/status endpoints serve the organization directory.
  PUT users/{user_id}/roles replaces assignable staff roles atomically.
- Organization settings, join-code regeneration, academic terms and tenant audit logs are included.
All routes above have /api as their prefix; Swagger documents exact methods and bodies.

Platform administrators manage tenants; they do not automatically receive organization access.
Tenant operations check participation, tenant status and live permissions on every request.
Only ORG_ADMIN is persistent; committee roles require the current, unexpired academic term.
Database constraints prevent cross-tenant role/term references and multiple current terms.
Role and permission catalogs are seeded by 0003_access; services read grants from the database.
MEMBER and GUEST cannot be assigned as staff roles. Until the paid membership module exists,
the context returns membership=null and is_member=false. Commerce and finance APIs are later modules.

### Run locally

Keep the existing .env. Start FastAPI from D:/EDVEXA/backend:
```powershell
python -m uvicorn app.main:create_app --factory --reload --reload-dir app --host 127.0.0.1 --port 8000
```

Start React in a second terminal from D:/EDVEXA/frontend:
```powershell
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```
Open http://localhost:5173. Default API is http://localhost:8000/api.
VITE_API_URL can override it; .env.example documents this. Use localhost consistently in
browser URLs for frontend and API. If the frontend port/origin changes, update CORS_ORIGINS.
Access tokens stay in memory. React bootstraps CSRF and rotates the HttpOnly refresh cookie;
modern browsers' Web Locks serialize refresh/logout between tabs.
Verification/reset/invitation links use #token= and are consumed by an explicit button action.
Link secrets are removed from the address bar after the page loads; reopen the original link
if you reload that page before submitting it.

### When PostgreSQL is ready

No database migration was applied during this implementation.
Use this Alembic chain for our backend; the GitHub repository's previous SQL schema belongs
to its different backend and must not be mixed into the same database.
After setting DATABASE_URL for the intended database:
```powershell
python -m alembic upgrade head
python -m scripts.bootstrap_admin --email your-admin@example.com --name "Your Name"
```
The trusted operator command prompts for a password when creating a new administrator;
it does not install a default password or change an existing account's password.

Sign in as platform admin, create the organization, and share the generated invitation link
with its intended administrator. Invitations are created as links; no invitation email is sent.
The administrator accepts, signs in, and opens Users & Roles to create and activate a term.
Students register with the join code, verify email, and sign in. The administrator can then
assign Treasurer, Event Manager, Gate Staff or Volunteer roles for that term.

For registration/reset emails configure SMTP settings and run:
```powershell
python -m scripts.send_auth_emails --watch --interval 5
```
Requests enqueue encrypted messages; an accepted response does not mean SMTP delivery succeeded.

### Validation and limits

126 backend tests pass, including migrations/catalog seeding, tenant isolation, live revocation,
term expiry/switching, protected roles, invitation replay and password change.
React production build passes. Browser checks used an isolated SQLite test database:
login, reload/CSRF refresh, user directory, organization navigation, logout and invalid-link errors.
PostgreSQL-specific concurrency and real SMTP delivery still need verification when configured.
The inherited frontend has lint warnings and a large bundle warning; neither blocks its build.
The backend's existing Starlette HTTPX deprecation warning is non-blocking.
No changes have been pushed to GitHub.
