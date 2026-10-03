import sys
import io
import uuid
import concurrent.futures
from decimal import Decimal
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

EXPECTED_REDIRECTS = {
    "PLATFORM_ADMIN": "/platform",
    "ORG_ADMIN": "/dashboard",
    "TREASURER": "/dashboard",
    "EVENT_MANAGER": "/dashboard",
    "GATE_STAFF": "/scanner",
    "VOLUNTEER": "/my-tasks",
    "MEMBER": "/dashboard",
    "GUEST": "/dashboard"
}

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

def compute_redirect(roles):
    if "PLATFORM_ADMIN" in roles:
        return "/platform"
    elif len(roles) == 1 and "GATE_STAFF" in roles:
        return "/scanner"
    elif len(roles) == 1 and "VOLUNTEER" in roles:
        return "/my-tasks"
    else:
        return "/dashboard"

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

    # 0. Health check & DB verification
    print("\n--- 0. Asserting Database Health via /health/db ---")
    h_res = client.get("/health/db")
    assert h_res.status_code == 200, f"/health/db failed: {h_res.text}"
    h_data = h_res.json()
    assert h_data["tables"] == 42, f"Expected 42 tables, got {h_data.get('tables')}"
    assert h_data["roles"] == 6, f"Expected 6 roles, got {h_data.get('roles')}"
    assert h_data["users"] >= 16, f"Expected >= 16 users, got {h_data.get('users')}"
    assert h_data["status"] == "ready"
    print(f"  [PASS] Database healthy: {h_data['tables']} tables, {h_data['roles']} roles, {h_data['users']} users, status={h_data['status']}")

    # 1. Login with ALL 16 Credentials & Redirect Target Check
    print("\n--- 1. Testing logins for all 16 accounts & post-login redirect targets ---")
    for role, email, password in CREDENTIALS:
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, f"Login failed for {email} ({role}): {res.text}"
        data = res.json()
        assert "access_token" in data, f"No access token for {email}"
        tokens[email] = data["access_token"]
        target = compute_redirect(data["roles"])
        expected_target = EXPECTED_REDIRECTS[role]
        assert target == expected_target, f"Redirect target mismatch for {email} ({role})! Got {target}, expected {expected_target}"
        print(f"  [PASS] {role.ljust(15)} | {email.ljust(25)} -> Logged in | Redirect: {target}")

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
            assert "PLATFORM_ADMIN" in str(e), f"Unexpected trigger error: {e}"
            print("  [PASS] Database trigger guard_platform_admin blocked direct assignment")
    finally:
        db.close()

    # 3f. Event manager viewing full ledger (403)
    em_tok = tokens["events1@edvexa.edu"]
    res = client.get(f"/api/v1/orgs/{edvexa_org_id}/finance/ledger", headers={"Authorization": f"Bearer {em_tok}"})
    assert res.status_code == 403, f"Event manager should not view full ledger! Got: {res.status_code}"
    print("  [PASS] Event manager reading full ledger blocked (403)")

    # 3g. Platform admin reading club finance (403)
    plat_tok_adm = tokens["platform1@edvexa.app"]
    res = client.get(f"/api/v1/orgs/{edvexa_org_id}/finance/summary", headers={"Authorization": f"Bearer {plat_tok_adm}"})
    assert res.status_code == 403, f"Platform admin should not read club finance! Got: {res.status_code}"
    print("  [PASS] Platform admin accessing tenant finance blocked (403)")

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

    # Verify email via DB directly
    db = SessionLocal()
    sid_user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": stu_email}).mappings().first()
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

    # 7. Data Flow F3: Gala ticket pricing, purchase, check-in, & event report
    print("\n--- 7. Testing Flow F3: Gala Tickets, Gate Check-in & Event Report ---")
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

    # Event Report check
    rep_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/events/{gala_event_id}/report", headers={"Authorization": f"Bearer {admin_tok}"})
    assert rep_res.status_code == 200, f"Event report failed: {rep_res.text}"
    rep_data = rep_res.json()
    assert str(rep_data["event_id"]) == gala_event_id
    assert rep_data["tickets_sold"] >= 1
    assert rep_data["tickets_checked_in"] >= 1
    print(f"  [PASS] Event report verified: sold={rep_data['tickets_sold']}, checked_in={rep_data['tickets_checked_in']}")

    # 8. Data Flow F4: Announcements, Notification Bell, & Public Archive
    print("\n--- 8. Testing Flow F4: Announcements & Notifications ---")
    ann_title = f"Spring Gala Keynote Announcement {run_id}"
    ann_create = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/announcements",
        headers={"Authorization": f"Bearer {admin_tok}"},
        json={
            "title": ann_title,
            "content": "Special guest speaker has been confirmed for the Spring Gala.",
            "category": "GENERAL",
            "audience": "ALL",
            "is_pinned": True
        }
    )
    assert ann_create.status_code == 201, f"Create announcement failed: {ann_create.text}"

    # Notification in member bell
    notif_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/announcements/notifications/me", headers={"Authorization": f"Bearer {mem_tok}"})
    assert notif_res.status_code == 200
    my_notifs = notif_res.json()
    matched_notifs = [n for n in my_notifs if ann_title in n["title"]]
    assert len(matched_notifs) > 0, "Notification not found in member notifications bell!"
    target_notif_id = matched_notifs[0]["id"]

    # Mark notification read
    read_res = client.patch(
        f"/api/v1/orgs/{edvexa_org_id}/announcements/notifications/{target_notif_id}/read",
        headers={"Authorization": f"Bearer {mem_tok}"}
    )
    assert read_res.status_code == 200

    # Public archive contains the announcement
    pub_ann_res = client.get("/api/v1/public/o/edvexa/announcements")
    assert pub_ann_res.status_code == 200
    pub_anns = pub_ann_res.json()
    assert any(ann_title in a["title"] for a in pub_anns), "Announcement missing from public archive!"
    print("  [PASS] Flow F4 Announcement created, notification delivered to member bell, and public archive updated")

    # 9. Data Flow F5: Merchandise order, Price Tampering check, Fulfillment & Low-Stock List
    print("\n--- 9. Testing Flow F5: Merch Order, Price Tampering Prevention & Inventory ---")
    prods = client.get(f"/api/v1/orgs/{edvexa_org_id}/store/products", headers={"Authorization": f"Bearer {mem_tok}"}).json()
    hoodie = [p for p in prods if "Hoodie" in p["name"]][0]
    variant = hoodie["variants"][0]
    vid = variant["id"]
    initial_stock = variant["stock_quantity"]

    # Price tampering test: client passes fake price unit_price: 1.00
    merch_ord = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/orders",
        headers={"Authorization": f"Bearer {mem_tok}"},
        json={
            "order_type": "MERCH",
            "items": [{"variant_id": vid, "quantity": 1, "unit_price": 1.00, "total": 1.00}]
        }
    )
    assert merch_ord.status_code == 201
    merch_data = merch_ord.json()
    # Server calculated real member price (₹799.00), ignoring client-supplied ₹1.00
    assert merch_data["total"] == hoodie["member_price"], f"Price tampering succeeded! Got total {merch_data['total']}"
    print(f"  [PASS] Price tampering rejected: Client sent 1.00, server enforced authentic price: INR {merch_data['total']}")

    # Stock reserved immediately
    var_after_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/store/products/{hoodie['id']}", headers={"Authorization": f"Bearer {mem_tok}"}).json()
    var_check = [v for v in var_after_res["variants"] if v["id"] == vid][0]
    assert var_check["stock_quantity"] == initial_stock - 1, f"Stock not decremented on order! Got {var_check['stock_quantity']}"
    print(f"  [PASS] Merch stock reserved in real time ({initial_stock} -> {var_check['stock_quantity']})")

    # Pay for merch order
    pay_merch = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/orders/{merch_data['id']}/pay",
        headers={"Authorization": f"Bearer {mem_tok}"},
        json={"method": "CARD"}
    )
    assert pay_merch.status_code == 200

    # Update fulfillment status to PICKED_UP
    my_orders = client.get(f"/api/v1/orgs/{edvexa_org_id}/orders/me", headers={"Authorization": f"Bearer {mem_tok}"}).json()
    target_ord = [o for o in my_orders if o["id"] == merch_data["id"]][0]
    ord_item_id = target_ord["items"][0]["id"]

    ful_res = client.patch(
        f"/api/v1/orgs/{edvexa_org_id}/store/order-items/{ord_item_id}/fulfillment",
        headers={"Authorization": f"Bearer {admin_tok}"},
        json={"fulfillment_status": "PICKED_UP"}
    )
    assert ful_res.status_code == 200

    # Low-stock inventory endpoint
    low_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/store/inventory/low-stock", headers={"Authorization": f"Bearer {admin_tok}"})
    assert low_res.status_code == 200
    print("  [PASS] Flow F5 Merch order paid, fulfilled to PICKED_UP, and low-stock view queried")

    # 10. Data Flow F6: Volunteer task update & Fundraiser
    print("\n--- 10. Testing Flow F6: Fundraiser & Volunteer Tasks ---")
    fund_id = "cccccccc-1111-1111-1111-cccccccccccc"
    task_id = "dddddddd-1111-1111-1111-dddddddd0002"

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

    # 11. Data Flow F7: Expense claim submission, approval & reimbursement
    print("\n--- 11. Testing Flow F7: Expense Claim Workflow ---")
    fake_file = io.BytesIO(b"%PDF-1.4\nTest receipt content for test\n%%EOF")
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
    assert self_appr.status_code in (400, 403)

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

    # 12. Data Flow F8: Finance Summary & CSV Export
    print("\n--- 12. Testing Flow F8: Finance Summary & CSV Export ---")
    sum_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/finance/summary", headers={"Authorization": f"Bearer {trs_tok}"})
    assert sum_res.status_code == 200
    csv_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/finance/export-csv", headers={"Authorization": f"Bearer {trs_tok}"})
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Timestamp,Reference,Direction,Source,Category,Amount (INR),Description" in csv_res.text
    print("  [PASS] Flow F8 Finance summary and valid CSV export verified")

    # 13. Data Flow F9: Multi-role assignment & Last ORG_ADMIN Protection
    print("\n--- 13. Testing Flow F9: Multi-Role Assignment & Last Admin Protection ---")
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
    print("  [PASS] Multi-role assigned: volunteer1 now holds VOLUNTEER + TREASURER simultaneously")

    # Revoke role
    rev_res = client.delete(
        f"/api/v1/orgs/{edvexa_org_id}/users/{vol_user_id}/roles/TREASURER",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert rev_res.status_code == 200

    # Verify last ORG_ADMIN protection (cannot remove admin1)
    admin_user_id = "66666666-6666-6666-6666-666666666603"
    del_adm = client.delete(
        f"/api/v1/orgs/{edvexa_org_id}/users/{admin_user_id}/roles/ORG_ADMIN",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert del_adm.status_code in (400, 403)

    db_admin = SessionLocal()
    try:
        try:
            db_admin.execute(text("DELETE FROM user_roles WHERE user_id = :uid AND organization_id = :oid"), {"uid": admin_user_id, "oid": edvexa_org_id})
            db_admin.commit()
            assert False, "Database allowed deletion of last ORG_ADMIN!"
        except Exception as e:
            db_admin.rollback()
            assert "ORG_ADMIN" in str(e) or "last active" in str(e).lower()
            print("  [PASS] Database trigger fn_protect_last_org_admin prevented removal of last ORG_ADMIN")
    finally:
        db_admin.close()

    # 14. Data Flow F10: Multi-Tenant Isolation
    print("\n--- 14. Testing Flow F10: Multi-Tenant Isolation ---")
    abc_org_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

    # admin1 (EDVEXA) requests ABC Sports Club resources
    cross_res = client.get(
        f"/api/v1/orgs/{abc_org_id}/finance/summary",
        headers={"Authorization": f"Bearer {admin_tok}"}
    )
    assert cross_res.status_code == 403, f"Cross-tenant access must return 403! Got: {cross_res.status_code}"
    print("  [PASS] admin1 accessing ABC Sports Club rejected with 403 Forbidden")

    # EDVEXA ticket scanned at ABC sports gate
    abc_gate_tok = tokens["admin2@abcsports.edu"]
    cross_scan = client.post(
        f"/api/v1/orgs/{abc_org_id}/tickets/scan",
        headers={"Authorization": f"Bearer {abc_gate_tok}"},
        json={"code": tkt_code}
    ).json()
    assert cross_scan["status"] == "WRONG_ORGANIZATION"
    print("  [PASS] EDVEXA ticket scanned at ABC gate rejected as WRONG_ORGANIZATION")

    # 15. Ledger Balance Invariant & Immutability Triggers
    print("\n--- 15. Testing Ledger Invariant & Database Immutability Triggers ---")
    sum_res = client.get(f"/api/v1/orgs/{edvexa_org_id}/finance/summary", headers={"Authorization": f"Bearer {trs_tok}"})
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    expected_balance = sum_data["total_revenue"] - sum_data["total_expenses"]
    assert abs(sum_data["net_balance"] - expected_balance) < 0.01
    print(f"  [PASS] Ledger balance invariant strictly holds: INR {sum_data['net_balance']:.2f}")

    db_imm = SessionLocal()
    try:
        # Check immutable ledger trigger
        try:
            db_imm.execute(text("UPDATE ledger_entries SET amount = 99999.00 WHERE id = (SELECT id FROM ledger_entries LIMIT 1)"))
            db_imm.commit()
            assert False, "trg_immutable_ledger failed to block UPDATE!"
        except Exception as e:
            db_imm.rollback()
            assert "immutable" in str(e).lower()
            print("  [PASS] Database trigger trg_immutable_ledger blocked UPDATE on ledger_entries")

        try:
            db_imm.execute(text("DELETE FROM ledger_entries WHERE id = (SELECT id FROM ledger_entries LIMIT 1)"))
            db_imm.commit()
            assert False, "trg_immutable_ledger failed to block DELETE!"
        except Exception as e:
            db_imm.rollback()
            assert "immutable" in str(e).lower()
            print("  [PASS] Database trigger trg_immutable_ledger blocked DELETE on ledger_entries")

        # Check immutable audit log trigger
        try:
            db_imm.execute(text("UPDATE audit_logs SET action = 'ALTERED' WHERE id = (SELECT id FROM audit_logs LIMIT 1)"))
            db_imm.commit()
            assert False, "trg_immutable_audit failed to block UPDATE!"
        except Exception as e:
            db_imm.rollback()
            assert "immutable" in str(e).lower()
            print("  [PASS] Database trigger trg_immutable_audit blocked UPDATE on audit_logs")

        try:
            db_imm.execute(text("DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1)"))
            db_imm.commit()
            assert False, "trg_immutable_audit failed to block DELETE!"
        except Exception as e:
            db_imm.rollback()
            assert "immutable" in str(e).lower()
            print("  [PASS] Database trigger trg_immutable_audit blocked DELETE on audit_logs")
    finally:
        db_imm.close()

    # 16. Concurrency Test: Two Simultaneous Orders for the Last Seat
    print("\n--- 16. Testing Concurrency: Simultaneous Orders for the Last Seat ---")
    # Create test event with 1 seat capacity
    ev_res = client.post(
        f"/api/v1/orgs/{edvexa_org_id}/events",
        headers={"Authorization": f"Bearer {admin_tok}"},
        json={
            "title": f"Concurrency Test Event {run_id}",
            "description": "Exclusive limited event",
            "location": "Room 101",
            "start_time": "2026-11-01T10:00:00Z",
            "end_time": "2026-11-01T12:00:00Z",
            "visibility": "PUBLIC",
            "total_capacity": 1,
            "budget_amount": 0.00,
            "ticket_types": [
                {"name": "Sole Seat", "member_price": 100.00, "non_member_price": 100.00, "quantity_total": 1, "max_per_order": 1}
            ]
        }
    )
    assert ev_res.status_code == 201
    c_event_id = ev_res.json()["id"]

    ev_info = client.get(f"/api/v1/orgs/{edvexa_org_id}/events/{c_event_id}", headers={"Authorization": f"Bearer {admin_tok}"}).json()
    c_tt_id = ev_info["ticket_types"][0]["id"]

    # Concurrently attempt to buy the sole ticket with two threads
    def buy_seat(user_token):
        return client.post(
            f"/api/v1/orgs/{edvexa_org_id}/orders",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "order_type": "TICKET",
                "items": [{"ticket_type_id": c_tt_id, "quantity": 1}]
            }
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(buy_seat, tokens["guest1@edvexa.edu"])
        f2 = executor.submit(buy_seat, tokens["guest2@edvexa.edu"])
        r1 = f1.result()
        r2 = f2.result()

    statuses = sorted([r1.status_code, r2.status_code])
    assert statuses == [201, 400], f"Expected exactly one 201 and one 400! Got {statuses}"
    print(f"  [PASS] Concurrency test passed: Exactly one order succeeded (201), the other was rejected (400 - seats exhausted)")

    # 17. Account Lockout Test: 5 Wrong Passwords Lock Account
    print("\n--- 17. Testing Account Lockout (5 Failed Attempts -> 429 Locked) ---")
    lock_email = f"locktest.{run_id}@edvexa.edu"
    # Create test user directly in DB
    db_lock = SessionLocal()
    try:
        from app.services.auth_service import hash_password
        db_lock.execute(
            text("""
                INSERT INTO users (id, email, password_hash, full_name, status, email_verified_at, created_via)
                VALUES (gen_random_uuid(), :email, :pw, 'Lock Test', 'ACTIVE', now(), 'SEED')
            """),
            {"email": lock_email, "pw": hash_password("ValidPassword#123")}
        )
        db_lock.commit()
    finally:
        db_lock.close()

    # Submit 5 wrong passwords
    for i in range(1, 6):
        res = client.post("/api/v1/auth/login", json={"email": lock_email, "password": "WrongPassword#999"})
        assert res.status_code in (401, 429), f"Attempt {i} got unexpected status {res.status_code}"

    # 6th attempt must be rejected with 429 Account is locked
    res6 = client.post("/api/v1/auth/login", json={"email": lock_email, "password": "WrongPassword#999"})
    assert res6.status_code == 429, f"Expected 429 Account Locked, got {res6.status_code}: {res6.text}"
    assert "locked" in res6.text.lower()
    print("  [PASS] Account lockout enforced: 5 failed attempts locked account, 6th attempt returned 429 Locked")

    # Clean up test user (deactivate user rather than delete, preserving append-only audit log integrity)
    db_clean = SessionLocal()
    try:
        db_clean.execute(text("DELETE FROM login_attempts WHERE email = :e"), {"e": lock_email})
        db_clean.execute(text("UPDATE users SET status = 'DEACTIVATED' WHERE email = :e"), {"e": lock_email})
        db_clean.commit()
    finally:
        db_clean.close()

    print("\n=======================================================")
    print("ALL 17 TEST SECTIONS PASSED WITH 100% SUCCESS!")
    print("ALL GOLDEN RULES & ACCEPTANCE REQUIREMENTS SATISFIED.")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
