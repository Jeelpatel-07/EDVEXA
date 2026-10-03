# EDVEXA — Seeded Credentials

All 16 credentials below are pre-seeded in `edvexa_db` with active, email-verified accounts. Passwords are encrypted with standard bcrypt cost factor 12 using PostgreSQL's `pgcrypto` extension.

| Role | Email | Password | Organization | Note |
| :--- | :--- | :--- | :--- | :--- |
| **PLATFORM_ADMIN** | platform1@edvexa.app | `Plat@Edvexa#1` | *(none, platform)* | Seed-only platform governance |
| **PLATFORM_ADMIN** | platform2@edvexa.app | `Plat@Edvexa#2` | *(none, platform)* | Seed-only platform governance |
| **ORG_ADMIN** | admin1@edvexa.edu | `OrgAdmin@Edv#1` | EDVEXA Student Association | Full club governance & role assignment |
| **ORG_ADMIN** | admin2@abcsports.edu | `OrgAdmin@Abc#2` | ABC Sports Club | Multi-tenant isolation demo club admin |
| **TREASURER** | treasurer1@edvexa.edu | `Treasure@Edv#1` | EDVEXA Student Association | Full finance ledger, claim reviews & payouts |
| **TREASURER** | treasurer2@edvexa.edu | `Treasure@Edv#2` | EDVEXA Student Association | Secondary treasury auditor |
| **EVENT_MANAGER** | events1@edvexa.edu | `EventMgr@Edv#1` | EDVEXA Student Association | Events, tickets, catalog, read-only finance |
| **EVENT_MANAGER** | events2@edvexa.edu | `EventMgr@Edv#2` | EDVEXA Student Association | Secondary event coordinator |
| **GATE_STAFF** | gate1@edvexa.edu | `GateStaff@Edv#1` | EDVEXA Student Association | Rapid door check-in & QR scanner only |
| **GATE_STAFF** | gate2@edvexa.edu | `GateStaff@Edv#2` | EDVEXA Student Association | Secondary door gate staff |
| **VOLUNTEER** | volunteer1@edvexa.edu | `Volunteer@Edv#1` | EDVEXA Student Association | Task status updates & expense submission |
| **VOLUNTEER** | volunteer2@edvexa.edu | `Volunteer@Edv#2` | EDVEXA Student Association | Task status updates & expense submission |
| **MEMBER** | member1@edvexa.edu | `Member@Edv#1` | EDVEXA Student Association | Active Annual Gold Pass (expires 2026-12-31) |
| **MEMBER** | member2@edvexa.edu | `Member@Edv#2` | EDVEXA Student Association | Active Semester Pass (expiring in 15 days) |
| **GUEST** | guest1@edvexa.edu | `Guest@Edv#1` | EDVEXA Student Association | Active student user without paid membership |
| **GUEST** | guest2@edvexa.edu | `Guest@Edv#2` | EDVEXA Student Association | Active student user without paid membership |

---

### Key Architectural Notes
- **Derived Roles**: `MEMBER` and `GUEST` are derived roles computed directly from active, paid memberships (`fn_is_member`). They are never stored in `roles` or `user_roles`.
- **Platform Admin Protection**: Exactly 2 `PLATFORM_ADMIN` users exist. A PostgreSQL DB trigger blocks any insertion or role assignment of `PLATFORM_ADMIN` outside seed mode.
- **Tenant Isolation**: `admin2@abcsports.edu` has no access to `EDVEXA Student Association` data.
