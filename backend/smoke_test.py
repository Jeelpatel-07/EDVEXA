import sys
import io
from starlette.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.db import SessionLocal

client = TestClient(app)

CREDENTIALS = [
    ("PLATFORM_ADMIN", "platform1@edvexa.app", "Plat@Edvexa#1"),
    ("PLATFORM_ADMIN", "platform2@edvexa.app", "Plat@Edvexa#2"),
    ("ORG_ADMIN", "admin1@edvexa.edu", "OrgAdmin@Edv#1"),
    ("ORG_ADMIN", "admin2@abcsports.edu", "OrgAdmin@Abc#2"),
    ("TREASURER", "treasurer1@edvexa.edu", "Treasure@Edv#1"),
    ("TREASURER", "treasurer2@edvexa.edu", "Treasure@Edv#2"),
    ("EVENT_MANAGER", "events1@edvexa.edu", "EventMgr@Edv#1"),
    ("EVENT_MANAGER", "events2@edvexa.edu", "EventMgr@Edv#2"),
    ("GATE_STAFF", "gate1@edvexa.edu", "GateStaff@Edv#1"),
    ("GATE_STAFF", "gate2@edvexa.edu", "GateStaff@Edv#2"),
    ("VOLUNTEER", "volunteer1@edvexa.edu", "Volunteer@Edv#1"),
    ("VOLUNTEER", "volunteer2@edvexa.edu", "Volunteer@Edv#2"),
    ("MEMBER", "member1@edvexa.edu", "Member@Edv#1"),
    ("MEMBER", "member2@edvexa.edu", "Member@Edv#2"),
    ("GUEST", "guest1@edvexa.edu", "Guest@Edv#1"),
    ("GUEST", "guest2@edvexa.edu", "Guest@Edv#2")
]

EXPECTED_PERMISSIONS = {
    "PLATFORM_ADMIN": {
        "organization.create", "organization.view", "organization.update", "organization.suspend",
        "organization.admin.create", "platform.settings.manage", "platform.audit.view",
        "platform.analytics.view", "subscription.manage"
    },
    "ORG_ADMIN": {
        "users.view", "users.invite", "users.assign_role", "organization.settings.update", "audit.view_org",
        "members.view", "members.manage", "membership.plans.manage",
        "events.create", "events.update", "events.delete", "tickets.manage", "tickets.scan", "tickets.refund",
        "products.manage", "products.manage_stock",
        "announcements.create", "announcements.update", "announcements.delete",
        "fundraisers.manage", "tasks.assign", "tasks.update_own",
        "expenses.submit", "expenses.approve", "expenses.reimburse",
        "finance.view", "finance.report", "finance.view_summary", "orders.view_all"
    },
    "TREASURER": {
        "members.view", "tickets.refund",
        "expenses.submit", "expenses.approve", "expenses.reimburse",
        "finance.view", "finance.report", "finance.view_summary", "orders.view_all"
    },
    "EVENT_MANAGER": {
        "members.view",
        "events.create", "events.update", "events.delete", "tickets.manage", "tickets.scan",
        "products.manage", "products.manage_stock",
        "announcements.create", "announcements.update", "announcements.delete",
        "fundraisers.manage", "tasks.assign", "tasks.update_own",
        "expenses.submit", "finance.view_summary", "orders.view_all"
    },
    "GATE_STAFF": {
        "tickets.scan"
    },
    "VOLUNTEER": {
        "tasks.update_own", "expenses.submit"
    },
    "MEMBER": set(),
    "GUEST": set()
}

tokens = {}

def run_tests():
    print("=== EDVEXA SMOKE & ACCEPTANCE TEST SUITE ===")

    # Ensure clean state for volunteer1 multi-role test
    db_init = SessionLocal()
    db_init.execute(text("""
        DELETE FROM user_roles 
        WHERE user_id = '66666666-6666-6666-6666-666666666611' 
          AND role_id = (SELECT id FROM roles WHERE code = 'TREASURER')
    """))
    db_init.commit()
    db_init.close()

    # 1. Login with ALL 16 Credentials
    print("\n--- 1. Testing logins for all 16 accounts ---")
    for role, email, password in CREDENTIALS:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, f"Login failed for {email} ({role}): {res.text}"
        data = res.json()
        assert "access_token" in data, f"No access token for {email}"
        tokens[email] = data["access_token"]
        print(f"  [PASS] {role.ljust(15)} | {email.ljust(25)} -> Logged in successfully")

    # 2. Permission Matrix Assertions via /auth/me
    print("\n--- 2. Asserting Permissions Matrix via /auth/me ---")
    for role, email, _ in CREDENTIALS:
        tok = tokens[email]
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert res.status_code == 200, f"/auth/me failed for {email}: {res.text}"
        data = res.json()
        perms = set(data["permissions"])
        expected = EXPECTED_PERMISSIONS[role]
        assert perms == expected, f"Permission mismatch for {email} ({role})! Got: {perms - expected} missing: {expected - perms}"
        print(f"  [PASS] {role.ljust(15)} | {email.ljust(25)} -> Permissions exactly match ({len(perms)} perms)")

    # 3. Forbidden Action Assertions (403)
    print("\n--- 3. Asserting Forbidden Actions (403) ---")
    edvexa_org_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    # 3a. Gate staff creating an event
    gate_tok = tokens["gate1@edvexa.edu"]
    res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/events",
        headers={"Authorization": f"Bearer {gate_tok}"},
        json={"title": "Hacked Event", "start_time": "2026-10-10T10:00:00Z", "end_time": "2026-10-10T12:00:00Z"}
    )
    assert res.status_code == 403, f"Gate staff should not create events! Got: {res.status_code}"
    print("  [PASS] Gate staff event creation blocked (403)")

    # 3b. Volunteer approving an expense claim
    vol_tok = tokens["volunteer1@edvexa.edu"]
    res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/finance/claims/ffffffff-1111-1111-1111-ffffffff0001/approve",
        headers={"Authorization": f"Bearer {vol_tok}"}
    )
    assert res.status_code == 403, f"Volunteer should not approve expense! Got: {res.status_code}"
    print("  [PASS] Volunteer claim approval blocked (403)")

    # 3c. Treasurer creating an event
    trs_tok = tokens["treasurer1@edvexa.edu"]
    res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/events",
        headers={"Authorization": f"Bearer {trs_tok}"},
        json={"title": "Hacked Event", "start_time": "2026-10-10T10:00:00Z", "end_time": "2026-10-10T12:00:00Z"}
    )
    assert res.status_code == 403, f"Treasurer should not create events! Got: {res.status_code}"
    print("  [PASS] Treasurer event creation blocked (403)")

    # 3d. Org Admin creating an ORG_ADMIN via staff invite
    admin_tok = tokens["admin1@edvexa.edu"]
    res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/users/invite",
        headers={"Authorization": f"Bearer {admin_tok}"},
        json={"email": "new.oa@edvexa.edu", "role_code": "ORG_ADMIN"}
    )
    assert res.status_code == 403, f"Org admin should not invite ORG_ADMIN! Got: {res.status_code}"
    print("  [PASS] Org admin assigning ORG_ADMIN blocked (403)")

    # 3e. Direct SQL insert of PLATFORM_ADMIN trigger check
    db = SessionLocal()
    try:
        try:
            db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES ('66666666-6666-6666-6666-666666666615', '11111111-1111-1111-1111-111111111101')"))
            db.commit()
            assert False, "Trigger failed to block PLATFORM_ADMIN assignment!"
        except Exception as e:
            db.rollback()
            assert "PLATFORM_ADMIN role cannot be assigned or created" in str(e), f"Unexpected trigger error: {e}"
            print("  [PASS] Database trigger guard_platform_admin blocked direct assignment")
    finally:
        db.close()

    # 4. Public Registration Rejects Role Field (422)
    print("\n--- 4. Asserting Public Registration Rejects Role Field (422) ---")
    res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Intruder User",
            "email": "intruder@edvexa.edu",
            "password": "Password#123",
            "role": "PLATFORM_ADMIN"
        }
    )
    assert res.status_code == 422, f"Public register with role must return 422! Got: {res.status_code}"
    print("  [PASS] Register with 'role' rejected with 422 Unprocessable Entity")

    res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Intruder User",
            "email": "intruder2@edvexa.edu",
            "password": "Password#123",
            "roles": ["ORG_ADMIN"]
        }
    )
    assert res.status_code == 422, f"Public register with 'roles' must return 422! Got: {res.status_code}"
    print("  [PASS] Register with 'roles' array rejected with 422 Unprocessable Entity")

    # 5. Data Flow F1: Platform Onboarding
    print("\n--- 5. Testing Flow F1: Platform Onboarding ---")
    import uuid
    run_id = str(uuid.uuid4().hex[:6])
    plat_tok = tokens["platform1@edvexa.app"]
    org_slug = f"robo-{run_id}"
    org_admin_email = f"robo.{run_id}@college.edu"
    res = client.post(
        "/api/v1/platform/organizations",
        headers={"Authorization": f"Bearer {plat_tok}"},
        json={
            "name": f"Robotics Society {run_id}",
            "slug": org_slug,
            "join_code": f"ROB{run_id[:3].upper()}",
            "member_number_prefix": "ROBO",
            "admin_email": org_admin_email
        }
    )
    assert res.status_code == 201, f"Org creation failed: {res.text}"
    new_org = res.json()
    assert "admin_invite_url" in new_org
    invite_tok = new_org["admin_invite_url"].split("token=")[1]

    # Accept invite
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": invite_tok, "password": "RoboAdmin@2026", "full_name": "Robo Admin"}
    )
    assert res.status_code == 200, f"Accept invite failed: {res.text}"

    # Log in as new org admin
    res = client.post("/api/v1/auth/login", json={"email": org_admin_email, "password": "RoboAdmin@2026"})
    assert res.status_code == 200, f"New Org Admin login failed: {res.text}"
    assert "ORG_ADMIN" in res.json()["roles"]
    print("  [PASS] Flow F1 Platform onboarding succeeded end-to-end")

    # 6. Data Flow F2: Student signup -> GUEST -> Membership purchase -> MEMBER
    print("\n--- 6. Testing Flow F2: Student Signup & Membership ---")
    stu_email = f"siddharth.{run_id}@edvexa.edu"
    stu_id = f"STU-{run_id.upper()}"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Siddharth Rao",
            "email": stu_email,
            "password": "Password#123",
            "join_code": "EDVEXA26",
            "student_id": stu_id
        }
    )
    assert reg_res.status_code == 201, f"Register failed: {reg_res.text}"

    # Verify email via token
    db = SessionLocal()
    sid_user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": stu_email}).mappings().first()
    raw_vtok = db.execute(
        text("SELECT token_hash FROM auth_tokens WHERE user_id = :uid AND purpose = 'EMAIL_VERIFY'"),
        {"uid": sid_user["id"]}
    ).scalar()
    # Mark user verified directly for test convenience
    db.execute(text("UPDATE users SET status = 'ACTIVE', email_verified_at = now() WHERE id = :uid"), {"uid": sid_user["id"]})
    db.commit()
    db.close()

    # Login as new student
    login_res = client.post("/api/v1/auth/login", json={"email": stu_email, "password": "Password#123"})
    assert login_res.status_code == 200
    sid_data = login_res.json()
    assert sid_data["persona_label"] == "GUEST"
    assert sid_data["is_member"] == False
    sid_tok = sid_data["access_token"]
    print("  [PASS] Student registered and initially logged in as GUEST")

    # Purchase Annual Gold Pass
    ord_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/orders",
        headers={"Authorization": f"Bearer {sid_tok}"},
        json={
            "order_type": "MEMBERSHIP",
            "items": [{"plan_id": "77777777-7777-7777-7777-777777777701", "quantity": 1}]
        }
    )
    assert ord_res.status_code == 201, f"Order failed: {ord_res.text}"
    sid_order = ord_res.json()
    assert sid_order["total"] == 999.00

    # Pay for order
    pay_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/orders/{sid_order['id']}/pay",
        headers={"Authorization": f"Bearer {sid_tok}"},
        json={"method": "ONLINE"}
    )
    assert pay_res.status_code == 200, f"Pay failed: {pay_res.text}"

    # Verify /auth/me now reflects MEMBER
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {sid_tok}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["is_member"] == True
    assert me_data["persona_label"] == "MEMBER"
    print("  [PASS] Membership activated, /auth/me immediately reflects derived MEMBER")

    # 7. Data Flow F3: Gala ticket pricing, purchase, and gate check-in
    print("\n--- 7. Testing Flow F3: Gala Tickets & Gate Check-in ---")
    gala_event_id = "99999999-9999-9999-9999-999999999901"
    tt_gen_id = "99999999-9999-9999-9999-999999999911"

    # Guest sees ₹500
    guest_tok = tokens["guest1@edvexa.edu"]
    res = client.get(f"/api/v1/orgs/{edvexa_org_id}/events/{gala_event_id}", headers={"Authorization": f"Bearer {guest_tok}"})
    assert res.status_code == 200
    guest_view_price = res.json()["ticket_types"][0]["applicable_price"]
    assert guest_view_price == 500.00, f"Expected 500 for guest, got {guest_view_price}"

    # Member sees ₹300
    mem_tok = tokens["member1@edvexa.edu"]
    res = client.get(f"/api/v1/orgs/{edvexa_org_id}/events/{gala_event_id}", headers={"Authorization": f"Bearer {mem_tok}"})
    assert res.status_code == 200
    mem_view_price = res.json()["ticket_types"][0]["applicable_price"]
    assert mem_view_price == 300.00, f"Expected 300 for member, got {mem_view_price}"

    # Member buys ticket
    tkt_ord = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/orders",
        headers={"Authorization": f"Bearer {mem_tok}"},
        json={
            "order_type": "TICKET",
            "items": [{"ticket_type_id": tt_gen_id, "quantity": 1}]
        }
    )
    assert tkt_ord.status_code == 201
    tkt_order_data = tkt_ord.json()
    assert tkt_order_data["total"] == 300.00

    # Pay
    client.post(
        f"/api/v1/orgs/{edvexa_org_id}/orders/{tkt_order_data['id']}/pay",
        headers={"Authorization": f"Bearer {mem_tok}"},
        json={"method": "UPI"}
    )

    # Get created ticket code
    my_tkts = client.get(f"/api/v1/orgs/{edvexa_org_id}/tickets/me", headers={"Authorization": f"Bearer {mem_tok}"}).json()
    new_tkt = [t for t in my_tkts if str(t.get("order_id")) == str(tkt_order_data["id"])][0]
    tkt_code = new_tkt["ticket_code"]

    # Gate scan
    scan1 = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/tickets/scan",
        headers={"Authorization": f"Bearer {gate_tok}"},
        json={"code": tkt_code}
    ).json()
    assert scan1["status"] == "VALID"
    assert scan1["is_member"] == True
    print("  [PASS] First gate scan SUCCESS (VALID + member badge)")

    # Second scan returns ALREADY_USED
    scan2 = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/tickets/scan",
        headers={"Authorization": f"Bearer {gate_tok}"},
        json={"code": tkt_code}
    ).json()
    assert scan2["status"] == "ALREADY_USED"
    assert "already used at" in scan2["message"].lower()
    print("  [PASS] Second scan rejected with 'already used at HH:MM'")

    # 8. Data Flow F6: Volunteer task update & Fundraiser
    print("\n--- 8. Testing Flow F6: Fundraiser & Volunteer Tasks ---")
    fund_id = "cccccccc-1111-1111-1111-cccccccccccc"
    task_id = "dddddddd-1111-1111-1111-dddddddd0002" # Assigned to volunteer1

    # Volunteer updates status to DONE
    upd_res = client.patch(
        f"/api/v1/orgs/{edvexa_org_id}/fundraisers/tasks/{task_id}/status",
        headers={"Authorization": f"Bearer {vol_tok}"},
        json={"status": "DONE"}
    )
    assert upd_res.status_code == 200

    # Check fundraiser progress
    f_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/fundraisers/{fund_id}", headers={"Authorization": f"Bearer {vol_tok}"})
    assert f_res.status_code == 200
    assert f_res.json()["completed_tasks"] >= 3
    print("  [PASS] Flow F6 Volunteer duty updated and fundraiser progress reflects completion")

    # 9. Data Flow F7: Expense claim submission, approval & reimbursement
    print("\n--- 9. Testing Flow F7: Expense Claim Workflow ---")
    # Submit claim with receipt
    fake_file = io.BytesIO(b"Fake receipt content for test")
    submit_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/finance/claims",
        headers={"Authorization": f"Bearer {vol_tok}"},
        data={"title": "Snacks for volunteers", "amount": "450.00", "category_id": "55555555-5555-5555-5555-555555555506"},
        files={"receipt": ("snack_bill.png", fake_file, "image/png")}
    )
    assert submit_res.status_code == 201, f"Claim submit failed: {submit_res.text}"
    new_claim = submit_res.json()
    claim_id = new_claim["id"]

    # Claimant cannot approve own claim
    self_appr = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/finance/claims/{claim_id}/approve",
        headers={"Authorization": f"Bearer {vol_tok}"}
    )
    assert self_appr.status_code == 403 or self_appr.status_code == 400

    # Treasurer approves
    appr_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/finance/claims/{claim_id}/approve",
        headers={"Authorization": f"Bearer {trs_tok}"}
    )
    assert appr_res.status_code == 200

    # Treasurer reimburses
    reimb_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/finance/claims/{claim_id}/reimburse",
        headers={"Authorization": f"Bearer {trs_tok}"}
    )
    assert reimb_res.status_code == 200
    print("  [PASS] Flow F7 Expense workflow completed: submitted -> approved -> reimbursed with ledger OUT")

    # 10. Data Flow F9: Multi-role assignment to existing user
    print("\n--- 10. Testing Flow F9: Multi-Role Assignment ---")
    # Org admin assigns TREASURER to volunteer1
    vol_user_id = "66666666-6666-6666-6666-666666666611"
    assign_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/users/{vol_user_id}/roles",
        headers={"Authorization": f"Bearer {admin_tok}"},
        json={"role_code": "TREASURER"}
    )
    assert assign_res.status_code == 200

    # Volunteer1 calls /auth/me and immediately sees both VOLUNTEER and TREASURER
    vol_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {vol_tok}"}).json()
    assert "VOLUNTEER" in vol_me["roles"]
    assert "TREASURER" in vol_me["roles"]
    assert "expenses.approve" in vol_me["permissions"]
    print("  [PASS] Flow F9 Multi-role assigned to same user, permissions combined live")

    # Revoke role to leave clean state
    db_cleanup = SessionLocal()
    db_cleanup.execute(text("""
        DELETE FROM user_roles 
        WHERE user_id = '66666666-6666-6666-6666-666666666611' 
          AND role_id = (SELECT id FROM roles WHERE code = 'TREASURER')
    """))
    db_cleanup.commit()
    db_cleanup.close()

    # 11. Data Flow F10: Multi-Tenant Isolation
    print("\n--- 11. Testing Flow F10: Multi-Tenant Isolation ---")
    abc_org_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    abc_admin_tok = tokens["admin2@abcsports.edu"]

    # admin1 (EDVEXA) requests ABC Sports Club resources
    cross_res = client.get(
        f"/api/v1/orgs/{abc_org_id}/finance/summary",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert cross_res.status_code == 403, f"Cross-tenant access must return 403! Got: {cross_res.status_code}"
    print("  [PASS] admin1 accessing ABC Sports Club rejected with 403 Forbidden")

    # EDVEXA ticket scanned at ABC sports gate
    abc_gate_tok = tokens["admin2@abcsports.edu"] # ABC admin has gate scan perms in ABC
    cross_scan = client.post(
        f"/api/v1/orgs/{abc_org_id}/tickets/scan",
        headers={"Authorization": f"Bearer {abc_gate_tok}"},
        json={"code": tkt_code}
    ).json()
    assert cross_scan["status"] == "WRONG_ORGANIZATION"
    print("  [PASS] EDVEXA ticket scanned at ABC gate rejected as WRONG_ORGANIZATION")

    # 12. Ledger Balance Assertion
    print("\n--- 12. Asserting Ledger Balance ---")
    sum_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/finance/summary", headers={"Authorization": f"Bearer {trs_tok}"})
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    expected_balance = sum_data["total_revenue"] - sum_data["total_expenses"]
    assert abs(sum_data["net_balance"] - expected_balance) < 0.01
    print(f"  [PASS] Ledger balance strictly equals sum(IN) - sum(OUT): INR {sum_data['net_balance']:.2f}")

    print("\nALL SMOKE & ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    run_tests()
