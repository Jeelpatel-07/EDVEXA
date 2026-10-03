"""
EDVEXA Rich Demonstration Data Injector
Populates comprehensive, high-volume real-world scenario data across:
- Events & Multi-Tier Tickets
- Merchandise Catalog, Variants & Stock Movements
- Fundraisers & Volunteer Task Tracking
- Expense Claims, Receipts & Reconciled Financial Ledger
- Announcements & Notifications
- Diverse Memberships & Student Accounts
"""
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import create_engine, text
from app.config import settings

def run_populate():
    db_url = settings.DATABASE_URL.get_secret_value()
    print(f"Connecting to database: {db_url.split('@')[-1]}")
    engine = create_engine(db_url)

    now = datetime.now(timezone.utc)
    current_year = now.year

    edv_org_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    abc_org_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

    with engine.begin() as conn:
        print("\n--- 1. Verifying Organizations & Academic Terms ---")
        term_id = conn.execute(
            text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
            {"oid": edv_org_id}
        ).scalar()
        if not term_id:
            term_id = str(uuid.uuid4())
            conn.execute(
                text("""
                    INSERT INTO academic_terms (id, organization_id, name, start_date, end_date, is_current, created_at)
                    VALUES (:id, :oid, 'Academic Year 2026-27', '2026-08-01', '2027-05-31', true, :now)
                """),
                {"id": term_id, "oid": edv_org_id, "now": now}
            )

        # Ensure ABC Sports Club has a term
        abc_term_id = conn.execute(
            text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
            {"oid": abc_org_id}
        ).scalar()
        if not abc_term_id:
            abc_term_id = str(uuid.uuid4())
            conn.execute(
                text("""
                    INSERT INTO academic_terms (id, organization_id, name, start_date, end_date, is_current, created_at)
                    VALUES (:id, :oid, 'Sports Season 2026-27', '2026-08-01', '2027-05-31', true, :now)
                """),
                {"id": abc_term_id, "oid": abc_org_id, "now": now}
            )

        print("\n--- 2. Populating Rich Events & Ticket Tiers ---")
        events_data = [
            {
                "id": "99999999-9999-9999-9999-999999999902",
                "org_id": edv_org_id,
                "title": "EDVEXA AI & Robotics Hackathon 2026",
                "description": "48-hour flagship hackathon with tracks in Autonomous Systems, Agentic AI, and IoT. Mentors from top tech firms.",
                "location": "Innovation Hub, East Campus",
                "start_time": now + timedelta(days=14, hours=9),
                "end_time": now + timedelta(days=16, hours=17),
                "status": "PUBLISHED",
                "visibility": "PUBLIC",
                "total_capacity": 100,
                "banner_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    {"id": "99999999-9999-9999-9999-999999999921", "name": "Hacker Pass (Team of 1-4)", "m_price": 0.00, "nm_price": 250.00, "qty": 80, "sold": 45},
                    {"id": "99999999-9999-9999-9999-999999999922", "name": "Hardware Lab Track Pass", "m_price": 200.00, "nm_price": 500.00, "qty": 20, "sold": 12}
                ]
            },
            {
                "id": "99999999-9999-9999-9999-999999999903",
                "org_id": edv_org_id,
                "title": "Campus Acoustic Night & Open Mic",
                "description": "An intimate evening of live student performances, acoustic indie sets, poetry, and coffee bar.",
                "location": "Open Air Amphitheatre",
                "start_time": now + timedelta(days=21, hours=18),
                "end_time": now + timedelta(days=21, hours=22),
                "status": "PUBLISHED",
                "visibility": "PUBLIC",
                "total_capacity": 200,
                "banner_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    {"id": "99999999-9999-9999-9999-999999999931", "name": "Standard Admission", "m_price": 100.00, "nm_price": 200.00, "qty": 180, "sold": 60},
                    {"id": "99999999-9999-9999-9999-999999999932", "name": "Front Row Beanbag Pass", "m_price": 250.00, "nm_price": 400.00, "qty": 20, "sold": 20}
                ]
            },
            {
                "id": "99999999-9999-9999-9999-999999999904",
                "org_id": edv_org_id,
                "title": "Annual Leadership & Career Summit",
                "description": "Keynote panel featuring distinguished alumni in engineering, finance, and product management. Resume reviews included.",
                "location": "Auditorium A, Main Block",
                "start_time": now + timedelta(days=28, hours=10),
                "end_time": now + timedelta(days=28, hours=16),
                "status": "PUBLISHED",
                "visibility": "PUBLIC",
                "total_capacity": 250,
                "banner_url": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    {"id": "99999999-9999-9999-9999-999999999941", "name": "General Delegate", "m_price": 0.00, "nm_price": 150.00, "qty": 250, "sold": 80}
                ]
            },
            {
                "id": "99999999-9999-9999-9999-999999999905",
                "org_id": edv_org_id,
                "title": "Alumni Homecoming Dinner & Awards",
                "description": "Formal annual gala evening welcoming back alumni classes from the past decade.",
                "location": "Grand Banquet Hall, Student Center",
                "start_time": now + timedelta(days=45, hours=19),
                "end_time": now + timedelta(days=45, hours=23),
                "status": "DRAFT",
                "visibility": "PUBLIC",
                "total_capacity": 150,
                "banner_url": "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    {"id": "99999999-9999-9999-9999-999999999951", "name": "Alumni & Guest Dinner Pass", "m_price": 1000.00, "nm_price": 1500.00, "qty": 150, "sold": 0}
                ]
            },
            {
                "id": "99999999-9999-9999-9999-999999999906",
                "org_id": abc_org_id,
                "title": "Inter-Collegiate Football Championship",
                "description": "Championship match day featuring rival college varsity teams with commentary and halftime show.",
                "location": "Sports Complex Arena",
                "start_time": now + timedelta(days=10, hours=15),
                "end_time": now + timedelta(days=10, hours=19),
                "status": "PUBLISHED",
                "visibility": "PUBLIC",
                "total_capacity": 300,
                "banner_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    {"id": "99999999-9999-9999-9999-999999999961", "name": "Stadium Bleacher Ticket", "m_price": 50.00, "nm_price": 100.00, "qty": 300, "sold": 75}
                ]
            }
        ]

        for ev in events_data:
            conn.execute(
                text("""
                    INSERT INTO events (id, organization_id, title, description, location, start_time, end_time, status, visibility, total_capacity, term_id, banner_url, created_at)
                    VALUES (:id, :oid, :title, :desc, :loc, :st, :et, :stat, :vis, :cap, :tid, :burl, :now)
                    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
                """),
                {
                    "id": ev["id"], "oid": ev["org_id"], "title": ev["title"], "desc": ev["description"],
                    "loc": ev["location"], "st": ev["start_time"], "et": ev["end_time"], "stat": ev["status"],
                    "vis": ev["visibility"], "cap": ev["total_capacity"], "tid": term_id if ev["org_id"] == edv_org_id else abc_term_id,
                    "burl": ev["banner_url"], "now": now
                }
            )
            for tt in ev["tickets"]:
                conn.execute(
                    text("""
                        INSERT INTO ticket_types (id, organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order, created_at)
                        VALUES (:id, :oid, :eid, :name, :mp, :nmp, :qty, :sold, 4, :now)
                        ON CONFLICT (id) DO UPDATE SET quantity_total = EXCLUDED.quantity_total, quantity_sold = EXCLUDED.quantity_sold
                    """),
                    {
                        "id": tt["id"], "oid": ev["org_id"], "eid": ev["id"], "name": tt["name"],
                        "mp": tt["m_price"], "nmp": tt["nm_price"], "qty": tt["qty"], "sold": tt["sold"], "now": now
                    }
                )

        print("\n--- 3. Populating Merchandise Catalog, Variants & Low Stock ---")
        products_data = [
            {
                "id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaa03",
                "name": "EDVEXA Stainless Steel Tumbler 750ml",
                "desc": "Double-wall vacuum insulated water bottle with laser-engraved EDVEXA emblem. Keeps drinks cold for 24h.",
                "base_price": 450.00,
                "member_price": 350.00,
                "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0011", "sku": "EDV-BTL-TEAL", "size": "750ml", "color": "Teal Green", "stock": 45, "low": 10},
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0012", "sku": "EDV-BTL-BLK", "size": "750ml", "color": "Matte Black", "stock": 35, "low": 10}
                ]
            },
            {
                "id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaa04",
                "name": "EDVEXA Commuter Laptop Backpack",
                "desc": "Water-resistant ballistic nylon pack with padded 16-inch laptop compartment, USB passthrough, and luggage strap.",
                "base_price": 1299.00,
                "member_price": 999.00,
                "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0013", "sku": "EDV-BPK-CHR", "size": "24L", "color": "Charcoal Grey", "stock": 25, "low": 5},
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0014", "sku": "EDV-BPK-NVY", "size": "24L", "color": "Deep Navy", "stock": 20, "low": 5}
                ]
            },
            {
                "id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaa05",
                "name": "EDVEXA Tech Cable & Charger Organizer",
                "desc": "Compact travel pouch with elastic loops and mesh dividers for power banks, cables, and hard drives.",
                "base_price": 399.00,
                "member_price": 299.00,
                "image_url": "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0015", "sku": "EDV-PCH-TEAL", "size": "Compact", "color": "Teal", "stock": 3, "low": 8}, # LOW STOCK TRIGGER!
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0016", "sku": "EDV-PCH-BLK", "size": "Compact", "color": "Black", "stock": 0, "low": 8}   # OUT OF STOCK!
                ]
            },
            {
                "id": "aaaaaaaa-1111-1111-1111-aaaaaaaaaa06",
                "name": "EDVEXA Holographic Sticker Pack (10 Designs)",
                "desc": "Weatherproof vinyl stickers featuring club mascots, engineering jokes, and campus landmarks.",
                "base_price": 99.00,
                "member_price": 49.00,
                "image_url": "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=600&q=80",
                "variants": [
                    {"id": "bbbbbbbb-1111-1111-1111-bbbbbbbb0017", "sku": "EDV-STK-PK1", "size": "Standard", "color": "Multi", "stock": 150, "low": 20}
                ]
            }
        ]

        for p in products_data:
            conn.execute(
                text("""
                    INSERT INTO products (id, organization_id, name, description, base_price, member_price, is_active, image_url, created_at)
                    VALUES (:id, :oid, :name, :desc, :bp, :mp, true, :img, :now)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, base_price = EXCLUDED.base_price, member_price = EXCLUDED.member_price
                """),
                {
                    "id": p["id"], "oid": edv_org_id, "name": p["name"], "desc": p["desc"],
                    "bp": p["base_price"], "mp": p["member_price"], "img": p["image_url"], "now": now
                }
            )
            for v in p["variants"]:
                conn.execute(
                    text("""
                        INSERT INTO product_variants (id, organization_id, product_id, sku, size, color, stock_quantity, low_stock_threshold, created_at)
                        VALUES (:id, :oid, :pid, :sku, :size, :col, :qty, :low, :now)
                        ON CONFLICT (id) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity, low_stock_threshold = EXCLUDED.low_stock_threshold
                    """),
                    {
                        "id": v["id"], "oid": edv_org_id, "pid": p["id"], "sku": v["sku"],
                        "size": v["size"], "col": v["color"], "qty": v["stock"], "low": v["low"], "now": now
                    }
                )

        print("\n--- 4. Populating Second Major Fundraiser & Volunteer Tasks ---")
        f2_id = "cccccccc-1111-1111-1111-cccccccc0002"
        conn.execute(
            text("""
                INSERT INTO fundraisers (id, organization_id, name, description, goal_amount, raised_amount, budget_amount, status, lead_user_id, created_at)
                VALUES (:id, :oid, 'Rural School Science & Library Kit Drive', 'Equipping 5 underserved rural government schools with STEM experiment kits, microscopes, and 1,000 storybooks.', 80000.00, 54200.00, 5000.00, 'ACTIVE', '66666666-6666-6666-6666-666666666607', :now)
                ON CONFLICT (id) DO UPDATE SET raised_amount = 54200.00, status = 'ACTIVE'
            """),
            {"id": f2_id, "oid": edv_org_id, "now": now}
        )

        vol1_id = "66666666-6666-6666-6666-666666666611"
        vol2_id = "66666666-6666-6666-6666-666666666612"

        tasks_f2 = [
            ("dddddddd-1111-1111-1111-dddddddd0011", "Procure 200 science experiment kits", "Bulk order approved STEM kits from educational supplier", "DONE", vol1_id),
            ("dddddddd-1111-1111-1111-dddddddd0012", "Design campaign flyers and donation banner", "Create visuals for Instagram, campus bulletin boards, and library lobby", "DONE", vol2_id),
            ("dddddddd-1111-1111-1111-dddddddd0013", "Coordinate book sorting and packaging boxes", "Sort incoming book donations by grade level and inspect quality", "IN_PROGRESS", vol1_id),
            ("dddddddd-1111-1111-1111-dddddddd0014", "Host weekend donation collection table", "Staff the physical collection table outside the university cafeteria", "IN_PROGRESS", vol2_id),
            ("dddddddd-1111-1111-1111-dddddddd0015", "Coordinate delivery vehicle with campus fleet", "Reserve electric mini-truck for Saturday school delivery", "BLOCKED", vol2_id),
            ("dddddddd-1111-1111-1111-dddddddd0016", "Draft campaign completion summary and impact audit", "Compile photographs, receipts, and school acknowledgment letters", "TODO", vol1_id)
        ]

        for tid, title, desc, status_val, assignee in tasks_f2:
            conn.execute(
                text("""
                    INSERT INTO tasks (id, organization_id, title, description, status, priority, due_date, fundraiser_id, created_by, created_at)
                    VALUES (:id, :oid, :title, :desc, :stat, 'HIGH', :due, :fid, :cby, :now)
                    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, title = EXCLUDED.title
                """),
                {
                    "id": tid, "oid": edv_org_id, "title": title, "desc": desc, "stat": status_val,
                    "due": (now + timedelta(days=7)).date(), "fid": f2_id, "cby": vol1_id, "now": now
                }
            )
            # Assign
            conn.execute(
                text("""
                    INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_at, created_at)
                    VALUES (:oid, :tid, :uid, :now, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "tid": tid, "uid": assignee, "now": now}
            )

        print("\n--- 5. Populating Expense Claims, Receipts & Reconciled Ledger ---")
        cat_supplies = "55555555-5555-5555-5555-555555555506"
        cat_venue = "55555555-5555-5555-5555-555555555505"
        cat_mkt = "55555555-5555-5555-5555-555555555507"
        trs1_id = "66666666-6666-6666-6666-666666666605"

        extra_claims = [
            {
                "id": "ffffffff-1111-1111-1111-ffffffff0011",
                "cnum": "CLM-2026-00011",
                "user_id": vol1_id,
                "cat_id": cat_venue,
                "title": "Audio System & Microphone Rental for Gala",
                "desc": "Sound check equipment and twin wireless microphones for keynote speakers.",
                "amt": Decimal("4800.00"),
                "status": "APPROVED",
                "rev_by": trs1_id
            },
            {
                "id": "ffffffff-1111-1111-1111-ffffffff0012",
                "cnum": "CLM-2026-00012",
                "user_id": vol2_id,
                "cat_id": cat_mkt,
                "title": "Marketing Posters & Banner Vinyl Printing",
                "desc": "Waterproof vinyl flex banners for quad lawns and 200 A3 flyers.",
                "amt": Decimal("1750.00"),
                "status": "REIMBURSED",
                "rev_by": trs1_id
            },
            {
                "id": "ffffffff-1111-1111-1111-ffffffff0013",
                "cnum": "CLM-2026-00013",
                "user_id": vol1_id,
                "cat_id": cat_supplies,
                "title": "STEM Experiment Kit Consumables & Batteries",
                "desc": "9V battery packs, copper tape, and LED components for rural school kits.",
                "amt": Decimal("3200.00"),
                "status": "SUBMITTED",
                "rev_by": None
            },
            {
                "id": "ffffffff-1111-1111-1111-ffffffff0014",
                "cnum": "CLM-2026-00014",
                "user_id": vol2_id,
                "cat_id": cat_supplies,
                "title": "Pizza & Refreshments for Volunteer Sorting Night",
                "desc": "Late-night dinner for 12 student volunteers packing charity boxes.",
                "amt": Decimal("2200.00"),
                "status": "REIMBURSED",
                "rev_by": trs1_id
            },
            {
                "id": "ffffffff-1111-1111-1111-ffffffff0015",
                "cnum": "CLM-2026-00015",
                "user_id": vol1_id,
                "cat_id": cat_venue,
                "title": "Personal Premium Taxi Transportation",
                "desc": "Airport cab ride reimbursement claim.",
                "amt": Decimal("3500.00"),
                "status": "REJECTED",
                "rev_by": trs1_id,
                "reason": "Personal taxi rides violate the student council travel policy; use campus shuttle instead."
            }
        ]

        for clm in extra_claims:
            conn.execute(
                text("""
                    INSERT INTO expense_claims (id, organization_id, user_id, category_id, claim_number, title, description, amount, status, reviewed_by, reviewed_at, reject_reason, term_id, created_at)
                    VALUES (:id, :oid, :uid, :cid, :cnum, :title, :desc, :amt, :stat, :rev, :rev_at, :reas, :tid, :now)
                    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, title = EXCLUDED.title, amount = EXCLUDED.amount
                """),
                {
                    "id": clm["id"], "oid": edv_org_id, "uid": clm["user_id"], "cid": clm["cat_id"],
                    "cnum": clm["cnum"], "title": clm["title"], "desc": clm["desc"], "amt": clm["amt"], "stat": clm["status"],
                    "rev": clm["rev_by"], "rev_at": now if clm["rev_by"] else None, "reas": clm.get("reason"),
                    "tid": term_id, "now": now
                }
            )

            # Receipt
            conn.execute(
                text("""
                    INSERT INTO expense_receipts (organization_id, claim_id, file_name, file_url, file_size, mime_type, created_at)
                    VALUES (:oid, :cid, :fn, :furl, 142850, 'application/pdf', :now)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "oid": edv_org_id, "cid": clm["id"], "fn": f"receipt_{clm['cnum']}.pdf",
                    "furl": f"/uploads/receipts/{clm['cnum'].lower()}.pdf", "now": now
                }
            )

            # Post ledger OUT for REIMBURSED claims if not already posted
            if clm["status"] == "REIMBURSED":
                existing_le = conn.execute(
                    text("SELECT id FROM ledger_entries WHERE expense_claim_id = :cid"),
                    {"cid": clm["id"]}
                ).scalar()
                if not existing_le:
                    conn.execute(
                        text("""
                            INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, expense_claim_id, description, reference_number, recorded_by, created_at)
                            VALUES (gen_random_uuid(), :oid, :tid, :cid, 'OUT', :amt, 'EXPENSE_CLAIM', :eid, :desc, :ref, :rec, :now)
                        """),
                        {
                            "oid": edv_org_id, "tid": term_id, "cid": clm["cat_id"], "amt": clm["amt"],
                            "eid": clm["id"], "desc": f"Reimbursement payout for {clm['cnum']}: {clm['title']}",
                            "ref": clm["cnum"], "rec": trs1_id, "now": now
                        }
                    )

        print("\n--- 6. Populating Announcements & Targeted Notifications ---")
        anns = [
            ("aaaaaaaa-3333-3333-3333-aaaaaaaa0003", "Spring Gala 2026: VIP Entry Guidelines & Dress Code", "Formal attire required. VIP badge holders receive fast-track entry via West Gate.", "ALL", True),
            ("aaaaaaaa-3333-3333-3333-aaaaaaaa0004", "Academic Term Officer Elections Announcement", "Nominations for next semester club committees open on Monday. Learn about officer duties.", "ALL", False),
            ("aaaaaaaa-3333-3333-3333-aaaaaaaa0005", "Volunteer Appreciation Night & Certificate Handover", "All active volunteers are invited to the leadership banquet in the courtyard.", "VOLUNTEERS", False)
        ]

        for aid, title, content, aud, is_pin in anns:
            conn.execute(
                text("""
                    INSERT INTO announcements (id, organization_id, author_id, title, content, category, audience, is_pinned, publish_at, published_at, created_at)
                    VALUES (:id, :oid, '66666666-6666-6666-6666-666666666603', :title, :cnt, 'GENERAL', :aud, :pin, :now, :now, :now)
                    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content
                """),
                {
                    "id": aid, "oid": edv_org_id, "title": title, "cnt": content,
                    "aud": aud, "pin": is_pin, "now": now
                }
            )

        print("\n--- 7. Querying Updated Entity Tallies ---")
        counts = {}
        for tbl in ['events', 'ticket_types', 'products', 'product_variants', 'fundraisers', 'tasks', 'expense_claims', 'ledger_entries', 'announcements']:
            counts[tbl] = conn.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            print(f"  {tbl.ljust(20)}: {counts[tbl]}")

        # Assert ledger balance reconciliation
        sum_row = conn.execute(
            text("""
                SELECT 
                    coalesce(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as total_in,
                    coalesce(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as total_out
                FROM ledger_entries WHERE organization_id = :oid
            """),
            {"oid": edv_org_id}
        ).mappings().first()

        net = sum_row["total_in"] - sum_row["total_out"]
        print(f"\nReconciled Ledger Balance: INR {net:.2f} (IN: {sum_row['total_in']:.2f}, OUT: {sum_row['total_out']:.2f})")
        print("\nRICH DEMONSTRATION DATA INJECTED SUCCESSFULLY!")

if __name__ == "__main__":
    run_populate()
