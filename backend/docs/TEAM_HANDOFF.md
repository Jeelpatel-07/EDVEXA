# Part 1 integration contract

## Read the files in this order

| File | Responsibility |
| --- | --- |
| pyproject.toml | Python version, dependencies, pytest and Ruff settings |
| .env.example | Environment variables without real secrets |
| app/core/config.py | Pydantic Settings validation and hidden credentials |
| app/main.py | Application factory, lifespan resources, middleware and routers |
| app/api/health.py | Liveness and database connectivity |
| app/db/base.py | Single shared Base, UUID and timestamp mixins |
| app/db/session.py | Lazy PostgreSQL engine and per-request sessions |
| app/db/model_registry.py | Explicit future model imports for Alembic |
| app/core/security.py | Argon2id passwords, access JWTs, random tokens and digests |
| app/core/errors.py | Shared error JSON and validation redaction |
| app/core/rate_limits.py | Thread-safe local limiter and atomic shared Redis limiter |
| migrations/env.py | Alembic uses the same settings and Base |
| scripts/check_foundation.py | Read-only PostgreSQL/table-count check |
| tests/ | Configuration, security, HTTP, transaction and rate-limit tests |

## Ownership

Foundation owner maintains shared files, dependency changes, router registration,
model imports and migration history. Part 2 owns modules/accounts; Part 3 owns
modules/sessions; Part 4 owns modules/organizations and modules/access.
Agree signatures before parallel work and keep feature branches small.
Ownership reduces merge conflicts but cannot guarantee none.

## Database and transactions

Use the shared Base, not a second declarative base or engine. Routes use
db: Session = Depends(get_db). This dependency opens one session per request,
rolls back failures and closes it. It never commits on success. One top-level
service/route owns the transaction. Nested helpers may flush but never commit.
Part 2 reset calls Part 3 revoke_user_sessions(db, user_id) in the same transaction
so password update and session revocation succeed together.
Use synchronous routes for blocking SQLAlchemy/Redis/password work.

Name CHECK constraints explicitly: the naming convention uses constraint_name.
Timestamp mixin update defaults apply to ORM updates; raw SQL must maintain
updated_at. Organization-owned models need tenant-consistent foreign keys in
Part 4 migrations, not only frontend filtering.

## Security interfaces

- hash_password(password) / verify_password(password, password_hash)
- password_needs_rehash(password_hash)
- generate_opaque_token() / hash_opaque_token(raw_token)
- create_access_token(user_id, session_id) / decode_access_token(token)

Access tokens contain UUID sub, sid, jti, iat, exp, issuer, audience and token_type=access.
The algorithm is fixed to HS256. Tokens contain no organization roles.
Decoder validation does not grant access alone: Part 3 get_current_user must
check current account status and the live database session; Part 4 checks
current organization participation, role term and permission.

Refresh/reset/verification tokens are random opaque secrets. Persist only their
SHA-256 digests and expiry/consumption metadata. Never log raw tokens or put them
in audit JSON. Passwords use Argon2id, not the opaque-token digest.
Rotation, replay detection, cookies and CSRF enforcement belong to Part 3.

## Rate limits

Call enforce_rate_limit(request, scope=..., subject=..., limit=..., window_seconds=...)
before expensive auth work. Apply both an IP limit and a separately normalized-email
limit to login/reset routes. Choose exact policies with the accounts/session owners.
Use client_ip(request) with trusted proxy configuration, never raw forwarded headers.
Memory state is process-local; production configuration requires Redis.

## Error contract

```json
{
  "error": {"code": "FORBIDDEN", "message": "Access denied"},
  "request_id": "generated-uuid"
}
```

Raise AppError(status_code, code, message, headers=...) for expected failures.
Validation details contain locations and error types, not submitted values.
Unexpected failures return a generic 500. React displays the message and may
retain request_id for support. Success responses use ordinary Pydantic models.

## Part 2 is implemented

Accounts models, schemas, services, routes and encrypted email delivery are in
app/modules/accounts. The first migration is 0001_accounts. The README contains
the five endpoint contracts, SMTP setup and worker commands. PostgreSQL/SMTP
live checks are deferred; account flows are tested with an isolated database.

Part 3 must snapshot User.credential_version on sessions and reject mismatches on
both access and refresh. It also registers app.state.revoke_user_sessions = its
revoke_user_sessions helper, which never commits independently. Password reset
invokes that callback within its transaction; callback failure rolls everything back.

Part 4 adds organization participation and current role/permission checks. Only
after Parts 3–4 land, implement the idempotent initial organization/admin bootstrap.
Do not create extra global role fields in User or allow public signup to select roles.

## Part 3 is implemented

Session models, rotation, origin/CSRF checks, logout and current-user authentication
are in app/modules/sessions. The app registers revoke_user_sessions for password
reset. get_current_user is ready for organization dependencies in Part 4. Use the
existing database session; it may already have a transaction from authentication,
so a protected write must commit/rollback that transaction rather than blindly
opening another db.begin(). TokenResponse and the frontend refresh sequence are
documented in README. Latest migration head: 0002_sessions.

## First-module frontend integration

Frontend is in D:/EDVEXA/frontend; its API prefix is /api. Keep the tested backend.
The access module owns organization/context/admin APIs. 0003_access is the latest migration.
Use backend/README.md for the current endpoint contract and run/setup commands.
The old GitHub backend/SQL schema is not used. Do not run its SQL alongside these migrations.
Staff UI sends one PUT roles request; do not split it into independent remove/add requests.
TERM_REQUIRED means create and activate a term in Users & Roles before assigning staff.
Platform invitations are shareable links, not sent emails. Existing accounts must authenticate
before accepting an invitation. Do not reintroduce verification success fallbacks or fake tokens.
Paid membership calculation belongs to the later membership module; staff roles do not imply MEMBER.
