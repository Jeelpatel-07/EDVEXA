# EDVEXA frontend

This is the React frontend from Jeelpatel-07/EDVEXA, connected to the tested local FastAPI
backend in D:/EDVEXA/backend. The first module is authentication and organization access.

## Run

From D:/EDVEXA/frontend:
```powershell
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```
Default API: http://localhost:8000/api. Set VITE_API_URL in a local .env if necessary.
The backend must allow the frontend's exact origin. Use localhost for both browser URLs.

## First-module connection

src/api/axios.js owns in-memory access tokens, error formatting, CSRF bootstrap and
serialized cookie refresh/logout. src/api/authApi.js implements account requests.
AuthContext uses GET /api/auth/context; server roles/permissions govern route visibility.
Organization selection is stored on the backend session; there is no demo organization ID.

Registration posts full_name, email, password and optional join_code/student_id.
Passwords are 15–128 characters. Student IDs are organization-specific.
Verification, reset and invitation pages read real #token= links and require explicit submission.
A failed verification never shows success. Existing invitees sign in before accepting.
The organization picker supports selection and joining; users without a tenant see that page.
Users & Roles can create/activate academic terms and update staff roles atomically.
Platform pages use the new tenant administration endpoints.

## Scope

Membership, tickets, store, finance, announcements and other business pages remain frontend
work for subsequent backend modules. First-module responses do not fabricate paid membership.
Invitations produce a shareable link; they are not automatically emailed.
Account email delivery needs PostgreSQL, SMTP and the backend's email worker.
See D:/EDVEXA/backend/README.md for migration, administrator bootstrap and team setup.

## Checks

npm run build succeeds. npm run lint exits successfully with inherited warnings.
Browser integration was checked with disposable SQLite data. No project PostgreSQL
database was migrated. Use codex/backend-auth-module for this implementation.
