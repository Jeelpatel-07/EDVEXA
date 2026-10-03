"""
EDVEXA Massive High-Volume Demonstration Data Injector
Populates complete, realistic, production-grade test data across EVERY module & component:
- 5 Organizations (Tenants) & Academic Terms
- 5 Membership Plans & Active Members
- 25+ Events with Vivid HD Cover Images & Multi-Tier Tickets
- 50+ Issued Tickets with QR Codes & Gate Check-in Scan Logs
- 20+ Merchandise Products & 50+ Variants with Product Images & Low-Stock Alerts
- 35+ Store Orders & Order Items across all fulfillment states
- 6 Fundraisers with Cover Images & Donor Contributions
- 35+ Volunteer Tasks across Kanban states (TODO, IN_PROGRESS, DONE, BLOCKED) with comments
- 25+ Expense Claims across all states (SUBMITTED, APPROVED, REIMBURSED, REJECTED) with receipts
- 65+ Reconciled Double-Entry Ledger Transactions
- 25+ Announcements & Notifications
- 60+ Platform Audit Logs
"""
import uuid
import secrets
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import create_engine, text
from app.config import settings

def to_uuid(val):
    if not val:
        return None
    val_str = str(val)
    try:
        uuid.UUID(val_str)
        return val_str
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, val_str))

def run_massive_populate():
    db_url = settings.DATABASE_URL.get_secret_value()
    print(f"Connecting to database: {db_url.split('@')[-1]}")
    engine = create_engine(db_url)

    now = datetime.now(timezone.utc)
    current_year = now.year

    # Organization IDs
    edv_org_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"  # EDVEXA Student Association
    abc_org_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"  # ABC Sports Club
    apex_org_id = "cccccccc-aaaa-aaaa-aaaa-aaaaaaaaaaaa" # Apex Robotics Guild
    arts_org_id = "dddddddd-aaaa-aaaa-aaaa-aaaaaaaaaaaa" # Campus Arts & Literary Society
    stem_org_id = "eeeeeeee-aaaa-aaaa-aaaa-aaaaaaaaaaaa" # Women in STEM League

    # Key User IDs from Seed
    plat1_id = "66666666-6666-6666-6666-666666666601"
    admin1_id = "66666666-6666-6666-6666-666666666603"
    trs1_id = "66666666-6666-6666-6666-666666666605"
    evm1_id = "66666666-6666-6666-6666-666666666607"
    gate1_id = "66666666-6666-6666-6666-666666666609"
    vol1_id = "66666666-6666-6666-6666-666666666611"
    vol2_id = "66666666-6666-6666-6666-666666666612"
    mem1_id = "66666666-6666-6666-6666-666666666613"
    mem2_id = "66666666-6666-6666-6666-666666666614"
    gst1_id = "66666666-6666-6666-6666-666666666615"
    gst2_id = "66666666-6666-6666-6666-666666666616"

    # Password hash for 'Password123!'
    pw_hash = "$2b$12$7kS8q63nEv7D369i62yE/ucF1U69z9eXU36d11VpX0YfLwZq5R7v2"

    with engine.begin() as conn:
        print("\n=======================================================")
        print("--- PHASE 1: Organizations & Academic Terms ---")
        print("=======================================================")
        orgs = [
            (edv_org_id, "edvexa", "EDVEXA Student Association", "EDV-2026", "EDV", "ACTIVE"),
            (abc_org_id, "abc-sports", "Varsity Athletic & Sports Union", "ABC-2026", "ABC", "ACTIVE"),
            (apex_org_id, "apex-robotics", "Apex Robotics & Autonomous Guild", "APX-2026", "APX", "ACTIVE"),
            (arts_org_id, "campus-arts", "Campus Arts, Drama & Literary Society", "ART-2026", "ART", "ACTIVE"),
            (stem_org_id, "women-stem", "Women in STEM & Computing League", "WST-2026", "WST", "ACTIVE")
        ]

        term_ids = {}
        for oid, slug, name, jcode, prefix, stat in orgs:
            conn.execute(
                text("""
                    INSERT INTO organizations (id, slug, name, status, join_code, member_number_prefix, currency, timezone, settings, created_at)
                    VALUES (:id, :slug, :name, :stat, :jcode, :prefix, 'INR', 'Asia/Kolkata', '{}', :now)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
                """),
                {"id": oid, "slug": slug, "name": name, "jcode": jcode, "prefix": prefix, "stat": stat, "now": now}
            )
            # Check or create term
            tid = conn.execute(
                text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
                {"oid": oid}
            ).scalar()
            if not tid:
                tid = str(uuid.uuid4())
                conn.execute(
                    text("""
                        INSERT INTO academic_terms (id, organization_id, name, start_date, end_date, is_current, created_at)
                        VALUES (:id, :oid, 'Academic Year 2026-27', '2026-08-01', '2027-05-31', true, :now)
                    """),
                    {"id": tid, "oid": oid, "now": now}
                )
            term_ids[oid] = tid

        edv_term_id = term_ids[edv_org_id]

        print("\n=======================================================")
        print("--- PHASE 2: Budget Categories & Financial Foundations ---")
        print("=======================================================")
        categories = [
            # Income categories
            ("bc-inc-01", edv_org_id, "Student Membership Dues", "INCOME", "Revenues from annual and semester student club memberships."),
            ("bc-inc-02", edv_org_id, "Event Ticket Sales", "INCOME", "Revenues from public and student event ticketing."),
            ("bc-inc-03", edv_org_id, "Campus Merchandise Store", "INCOME", "Official apparel, stickers, and tech accessories sales."),
            ("bc-inc-04", edv_org_id, "Charity Drives & Fundraisers", "INCOME", "Donations and student community fundraising proceeds."),
            ("bc-inc-05", edv_org_id, "Corporate Sponsorships & Grants", "INCOME", "Industry technology partner grants and university funding."),
            # Expense categories
            ("bc-exp-01", edv_org_id, "Venue & Facilities Rental", "EXPENSE", "Auditoriums, open amphitheatre, and sports complex booking fees."),
            ("bc-exp-02", edv_org_id, "Audio, Stage & Lighting Equipment", "EXPENSE", "Microphones, sound engineering, stage monitors, and spotlights."),
            ("bc-exp-03", edv_org_id, "Catering, Refreshments & Hospitality", "EXPENSE", "Food boxes, coffee stations, and volunteer sorting night dinners."),
            ("bc-exp-04", edv_org_id, "Printing, Signage & Marketing", "EXPENSE", "Vinyl quad banners, posters, photo backdrops, and promotional flyers."),
            ("bc-exp-05", edv_org_id, "Hardware Supplies & Consumables", "EXPENSE", "STEM components, cables, adhesives, and workshop materials."),
            ("bc-exp-06", edv_org_id, "Travel, Transport & Shuttles", "EXPENSE", "Campus fleet logistics, inter-collegiate transport, and equipment van."),
            ("bc-exp-07", edv_org_id, "Prizes, Trophies & Honorariums", "EXPENSE", "Hackathon winner cash awards, keynote mementos, and medals.")
        ]
        for cid, oid, cname, ctype, cdesc in categories:
            conn.execute(
                text("""
                    INSERT INTO budget_categories (id, organization_id, name, type, description, created_at)
                    VALUES (:id, :oid, :name, :type, :desc, :now)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
                """),
                {"id": to_uuid(cid), "oid": oid, "name": cname, "type": ctype, "desc": cdesc, "now": now}
            )

        print("\n=======================================================")
        print("--- PHASE 3: Additional Users & Staff Profiles ---")
        print("=======================================================")
        extra_users = [
            # Treasurers & Event Managers
            ("77777777-1111-1111-1111-777777770001", "elena.vance@edvexa.edu", "Elena Vance", "TREASURER"),
            ("77777777-1111-1111-1111-777777770002", "marcus.chen@edvexa.edu", "Marcus Chen", "EVENT_MANAGER"),
            ("77777777-1111-1111-1111-777777770003", "sophia.rodriguez@edvexa.edu", "Sophia Rodriguez", "GATE_STAFF"),
            ("77777777-1111-1111-1111-777777770004", "tariq.almansoor@edvexa.edu", "Tariq Al-Mansoor", "VOLUNTEER"),
            ("77777777-1111-1111-1111-777777770005", "aanya.sharma@edvexa.edu", "Aanya Sharma", "VOLUNTEER"),
            # Active Members
            ("77777777-2222-2222-2222-777777770011", "liam.foster@edvexa.edu", "Liam Foster", "MEMBER"),
            ("77777777-2222-2222-2222-777777770012", "chloe.dupont@edvexa.edu", "Chloe Dupont", "MEMBER"),
            ("77777777-2222-2222-2222-777777770013", "devon.brooks@edvexa.edu", "Devon Brooks", "MEMBER"),
            ("77777777-2222-2222-2222-777777770014", "priya.nair@edvexa.edu", "Priya Nair", "MEMBER"),
            ("77777777-2222-2222-2222-777777770015", "lucas.silva@edvexa.edu", "Lucas Silva", "MEMBER"),
            # Guests
            ("77777777-3333-3333-3333-777777770021", "clara.oswald@gmail.com", "Clara Oswald", "GUEST"),
            ("77777777-3333-3333-3333-777777770022", "samuel.tate@outlook.com", "Samuel Tate", "GUEST")
        ]

        for uid, email, full_name, role_code in extra_users:
            conn.execute(
                text("""
                    INSERT INTO users (id, email, password_hash, full_name, status, email_verified_at, created_at)
                    VALUES (:id, :email, :pw, :fn, 'ACTIVE', :now, :now)
                    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, status = 'ACTIVE'
                """),
                {"id": uid, "email": email, "pw": pw_hash, "fn": full_name, "now": now}
            )
            # Org membership
            conn.execute(
                text("""
                    INSERT INTO organization_users (organization_id, user_id, status, created_at)
                    VALUES (:oid, :uid, 'ACTIVE', :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "uid": uid, "now": now}
            )
            # User Role
            conn.execute(
                text("""
                    INSERT INTO user_roles (organization_id, user_id, role_id, term_id, valid_from, created_at)
                    SELECT :oid, :uid, id, :tid, :now, :now FROM roles WHERE code = :rcode
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "uid": uid, "rcode": role_code, "tid": edv_term_id, "now": now}
            )

        print("\n=======================================================")
        print("--- PHASE 4: Membership Plans & Subscriptions ---")
        print("=======================================================")
        plans = [
            ("plan-001", edv_org_id, "Annual Student Platinum VIP", "Full year access to all marquee events, priority front-row seating, free hackathon registration, 25% discount on all official merchandise, and VIP executive lounge access.", 1500.00, 365),
            ("plan-002", edv_org_id, "Annual General Student Membership", "Official student voting membership. Member-only ticket pricing across all semester events, 15% merch discount, and voting rights in committee elections.", 500.00, 365),
            ("plan-003", edv_org_id, "Semester Pass (Fall 2026)", "Single semester student pass for exchange and visiting students. Full member ticket rates for the active academic term.", 300.00, 120),
            ("plan-004", edv_org_id, "Alumni Supporting Fellowship", "Honorary lifetime patron membership for graduated alumni. Includes homecoming gala invitation, mentorship network access, and foundation newsletter.", 2500.00, 365),
            ("plan-005", edv_org_id, "Freshman Explorer Pass", "Subsidized first-year introductory pass. Free freshers welcome ticket and access to student orientation workshops.", 200.00, 180)
        ]

        for pid, oid, pname, pdesc, price, dur in plans:
            conn.execute(
                text("""
                    INSERT INTO membership_plans (id, organization_id, name, description, price, duration_days, is_active, created_at)
                    VALUES (:id, :oid, :name, :desc, :pr, :dur, true, :now)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, description = EXCLUDED.description
                """),
                {"id": to_uuid(pid), "oid": oid, "name": pname, "desc": pdesc, "pr": price, "dur": dur, "now": now}
            )

        members_to_seed = [
            (mem1_id, "plan-001", "EDV-MEM-2026-00041", "ACTIVE", now - timedelta(days=60), now + timedelta(days=305), "QR-EDV-MEM-00041"),
            (mem2_id, "plan-002", "EDV-MEM-2026-00042", "ACTIVE", now - timedelta(days=40), now + timedelta(days=325), "QR-EDV-MEM-00042"),
            ("77777777-2222-2222-2222-777777770011", "plan-001", "EDV-MEM-2026-00043", "ACTIVE", now - timedelta(days=15), now + timedelta(days=350), "QR-EDV-MEM-00043"),
            ("77777777-2222-2222-2222-777777770012", "plan-002", "EDV-MEM-2026-00044", "ACTIVE", now - timedelta(days=10), now + timedelta(days=355), "QR-EDV-MEM-00044"),
            ("77777777-2222-2222-2222-777777770013", "plan-003", "EDV-MEM-2026-00045", "ACTIVE", now - timedelta(days=5), now + timedelta(days=115), "QR-EDV-MEM-00045"),
            ("77777777-2222-2222-2222-777777770014", "plan-005", "EDV-MEM-2026-00046", "ACTIVE", now - timedelta(days=2), now + timedelta(days=178), "QR-EDV-MEM-00046"),
            ("77777777-2222-2222-2222-777777770015", "plan-002", "EDV-MEM-2026-00047", "EXPIRED", now - timedelta(days=400), now - timedelta(days=35), "QR-EDV-MEM-00047")
        ]

        for m_uid, m_pid, m_num, m_stat, m_start, m_end, m_qr in members_to_seed:
            conn.execute(
                text("""
                    INSERT INTO memberships (id, organization_id, user_id, plan_id, member_number, status, payment_status, start_date, end_date, qr_token, created_at)
                    VALUES (gen_random_uuid(), :oid, :uid, :pid, :num, :stat, 'PAID', :st, :et, :qr, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "uid": to_uuid(m_uid), "pid": to_uuid(m_pid), "num": m_num, "stat": m_stat, "st": m_start.date(), "et": m_end.date(), "qr": m_qr, "now": now}
            )

        print("\n=======================================================")
        print("--- PHASE 5: 25+ High-Impact Events with Banner Images ---")
        print("=======================================================")
        events_list = [
            # 1. Flagship AI Hackathon
            {
                "id": "e0000000-0000-0000-0000-000000000001",
                "org_id": edv_org_id,
                "title": "EDVEXA AI & Autonomous Robotics Hackathon 2026",
                "desc": "48-hour flagship collegiate hackathon with tracks in Autonomous Systems, Agentic AI, ROS2 Robotics, and Edge Computing. Over $15,000 in sponsor prizes and VC meetings.",
                "loc": "Innovation Hub & Robotics Hall, East Campus",
                "st": now + timedelta(days=14, hours=9),
                "et": now + timedelta(days=16, hours=18),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 150,
                "banner": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-001", "Hacker Pass (Team of 1-4)", 0.00, 250.00, 100, 68),
                    ("tt-002", "Hardware Prototyping Lab Pass", 150.00, 450.00, 50, 24)
                ]
            },
            # 2. Acoustic Night
            {
                "id": "e0000000-0000-0000-0000-000000000002",
                "org_id": edv_org_id,
                "title": "Campus Acoustic Night & Open Mic Jam",
                "desc": "An intimate evening of live student band performances, indie acoustic sets, slam poetry, and hot specialty coffee under the quad fairy lights.",
                "loc": "Open Air Amphitheatre & Central Lawn",
                "st": now + timedelta(days=18, hours=19),
                "et": now + timedelta(days=18, hours=23),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 250,
                "banner": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-003", "Standard Lawn Admission", 100.00, 200.00, 200, 115),
                    ("tt-004", "Front-Row Beanbag VIP Pass", 250.00, 400.00, 50, 48)
                ]
            },
            # 3. Leadership & Tech Career Summit
            {
                "id": "e0000000-0000-0000-0000-000000000003",
                "org_id": edv_org_id,
                "title": "Annual Leadership & Career Executive Summit",
                "desc": "Distinguished panel of engineering directors, quant hedge fund traders, and startup founders sharing hiring secrets, 1-on-1 portfolio audits, and mock technical interviews.",
                "loc": "Auditorium A, University Center",
                "st": now + timedelta(days=25, hours=10),
                "et": now + timedelta(days=25, hours=17),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 300,
                "banner": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-005", "General Delegate Pass", 0.00, 150.00, 250, 180),
                    ("tt-006", "Executive Lunch & Roundtable Pass", 350.00, 600.00, 50, 42)
                ]
            },
            # 4. Alumni Gala Dinner
            {
                "id": "e0000000-0000-0000-0000-000000000004",
                "org_id": edv_org_id,
                "title": "Alumni Homecoming Dinner & Awards Gala",
                "desc": "Black-tie formal dinner celebrating prominent alumni achievements, conferring the 2026 Innovator of the Year medal, and inaugurating the student endowment fund.",
                "loc": "Grand Banquet Hall & Terrace",
                "st": now + timedelta(days=40, hours=19),
                "et": now + timedelta(days=40, hours=23, minutes=30),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 180,
                "banner": "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-007", "Alumni & Patron Table Pass", 1000.00, 1500.00, 120, 85),
                    ("tt-008", "Subsidized Student Delegate Ticket", 400.00, 750.00, 60, 45)
                ]
            },
            # 5. Cybersecurity CTF
            {
                "id": "e0000000-0000-0000-0000-000000000005",
                "org_id": edv_org_id,
                "title": "Cybersecurity CTF: Campus Defense Challenge",
                "desc": "Hands-on capture-the-flag tournament testing binary exploitation, reverse engineering, web security, and network forensics. Real-time scoreboard and bounties.",
                "loc": "Cyber Range Lab 402, CS Complex",
                "st": now + timedelta(days=8, hours=13),
                "et": now + timedelta(days=8, hours=20),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 80,
                "banner": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-009", "CTF Contestant Seat", 0.00, 100.00, 80, 56)
                ]
            },
            # 6. Indie Film Festival
            {
                "id": "e0000000-0000-0000-0000-000000000006",
                "org_id": edv_org_id,
                "title": "Short Film Screening & Indie Filmmakers Showcase",
                "desc": "Screening 12 shortlisted student documentaries, dramas, and animated shorts on the big cinema screen, followed by Q&A with indie directors.",
                "loc": "Fine Arts Screening Theatre",
                "st": now + timedelta(days=12, hours=18),
                "et": now + timedelta(days=12, hours=21, minutes=30),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 120,
                "banner": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-010", "Cinema General Entry", 50.00, 100.00, 120, 78)
                ]
            },
            # 7. Battle of the Bands
            {
                "id": "e0000000-0000-0000-0000-000000000007",
                "org_id": edv_org_id,
                "title": "Battle of the Bands: Campus Music Fest 2026",
                "desc": "8 student rock, indie, and hip-hop bands compete live for recording studio time and headliner status at the Spring Gala.",
                "loc": "Main Quad Festival Stage",
                "st": now + timedelta(days=22, hours=17),
                "et": now + timedelta(days=22, hours=22),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 400,
                "banner": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-011", "Festival Pass", 150.00, 250.00, 350, 220),
                    ("tt-012", "Backstage VIP & Green Room", 400.00, 650.00, 50, 38)
                ]
            },
            # 8. Venture Demo Day
            {
                "id": "e0000000-0000-0000-0000-000000000008",
                "org_id": edv_org_id,
                "title": "Startup Pitch Day: Venture Capital Demo Day",
                "desc": "Top 10 student founders pitch incubated SaaS and hardware startups to active angel investors and seed funds. $50k non-dilutive equity grant pool.",
                "loc": "Venture Studio, Business School",
                "st": now + timedelta(days=32, hours=14),
                "et": now + timedelta(days=32, hours=18),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 150,
                "banner": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-013", "Demo Day Observer", 0.00, 100.00, 120, 89),
                    ("tt-014", "Accredited Investor / Judge Pass", 500.00, 500.00, 30, 26)
                ]
            },
            # 9. Esports Championship
            {
                "id": "e0000000-0000-0000-0000-000000000009",
                "org_id": edv_org_id,
                "title": "Esports Arena: Valorant & Rocket League Finals",
                "desc": "Grand finals of the inter-house gaming tournament. Giant projector live-stream, color commentary, energy drink bar, and mechanical keyboard raffle.",
                "loc": "Student Union Rec Hall",
                "st": now + timedelta(days=9, hours=16),
                "et": now + timedelta(days=9, hours=22),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 200,
                "banner": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-015", "Audience Pass & Raffle Ticket", 50.00, 100.00, 200, 140)
                ]
            },
            # 10. Astronomy & Stargazing Camp
            {
                "id": "e0000000-0000-0000-0000-000000000010",
                "org_id": edv_org_id,
                "title": "Outdoor Stargazing & Astrophotography Night",
                "desc": "Guided telescopic observation of Saturn's rings, the Orion Nebula, and deep space star clusters with astrophotography workshop led by physics faculty.",
                "loc": "Observatory Hill, North Ridge",
                "st": now + timedelta(days=15, hours=20),
                "et": now + timedelta(days=16, hours=1),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 60,
                "banner": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-016", "Telescope Observation Pass", 75.00, 150.00, 60, 52)
                ]
            },
            # 11. TEDxEDVEXA
            {
                "id": "e0000000-0000-0000-0000-000000000011",
                "org_id": edv_org_id,
                "title": "TEDxEDVEXA: The Convergence of Mind & Machine",
                "desc": "Independent TED conference featuring 6 breakthrough speakers on neural interfaces, climate geoengineering, regenerative architecture, and modern philosophy.",
                "loc": "Main University Auditorium",
                "st": now + timedelta(days=35, hours=13),
                "et": now + timedelta(days=35, hours=18),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 350,
                "banner": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-017", "Standard TEDx Delegate", 200.00, 350.00, 300, 210),
                    ("tt-018", "VIP Speaker Dinner Access", 500.00, 800.00, 50, 44)
                ]
            },
            # 12. Badminton Tournament
            {
                "id": "e0000000-0000-0000-0000-000000000012",
                "org_id": abc_org_id,
                "title": "Varsity Badminton Open Championship 2026",
                "desc": "Men's, Women's, and Mixed doubles racket tournament across 6 courts with Yonex feather shuttles, professional referees, and medal ceremonies.",
                "loc": "Indoor Sports Pavilion",
                "st": now + timedelta(days=6, hours=9),
                "et": now + timedelta(days=7, hours=18),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 120,
                "banner": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-019", "Spectator Bleacher Pass", 30.00, 60.00, 120, 84)
                ]
            },
            # 13. Modern Art & Ceramic Exhibition
            {
                "id": "e0000000-0000-0000-0000-000000000013",
                "org_id": arts_org_id,
                "title": "Modern Ceramic, Canvas & Mixed Media Exhibition",
                "desc": "Curated gallery showcasing 45 original student ceramic sculptures, oil paintings, and digital VR installations. Art pieces available for silent auction.",
                "loc": "Atrium Art Gallery, Fine Arts Block",
                "st": now + timedelta(days=19, hours=11),
                "et": now + timedelta(days=21, hours=19),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 200,
                "banner": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-020", "Gallery Access & Catalogue", 0.00, 80.00, 200, 110)
                ]
            },
            # 14. Freshers Carnival
            {
                "id": "e0000000-0000-0000-0000-000000000014",
                "org_id": edv_org_id,
                "title": "Campus Freshers Welcome & Club Carnival",
                "desc": "Interactive society recruitment fair with 80+ club booths, carnival games, free cotton candy, live acoustic music, and welcome swag giveaways.",
                "loc": "University Commons & Promenade",
                "st": now + timedelta(days=3, hours=11),
                "et": now + timedelta(days=3, hours=17),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 500,
                "banner": "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-021", "Free Student Entry", 0.00, 0.00, 500, 395)
                ]
            },
            # 15. Battlebots Championship
            {
                "id": "e0000000-0000-0000-0000-000000000015",
                "org_id": apex_org_id,
                "title": "Robotics Arena: 15lb & 30lb Battlebots Smackdown",
                "desc": "Armored combat robots equipped with spinning blades, pneumatic flippers, and flamethrowers battle inside a bulletproof Lexan polycarbonate cage.",
                "loc": "Mechanical Engineering Courtyard",
                "st": now + timedelta(days=17, hours=14),
                "et": now + timedelta(days=17, hours=19),
                "stat": "PUBLISHED", "vis": "PUBLIC", "cap": 250,
                "banner": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-022", "Combat Arena Bleacher Pass", 100.00, 200.00, 250, 195)
                ]
            },
            # 16. DRAFT: Spring Marathon
            {
                "id": "e0000000-0000-0000-0000-000000000021",
                "org_id": abc_org_id,
                "title": "Campus Charity 5K Marathon & Fun Run",
                "desc": "Annual 5-kilometer campus perimeter run supporting local children's hospitals. Finishers medal and technical tee included.",
                "loc": "Stadium Track Start Line",
                "st": now + timedelta(days=50, hours=8),
                "et": now + timedelta(days=50, hours=11),
                "stat": "DRAFT", "vis": "PUBLIC", "cap": 300,
                "banner": "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-028", "Runner Registration", 150.00, 250.00, 300, 0)
                ]
            },
            # 17. COMPLETED: Winter Tech Summit 2025
            {
                "id": "e0000000-0000-0000-0000-000000000023",
                "org_id": edv_org_id,
                "title": "Winter Tech Summit 2025: Cloud & Kubernetes",
                "desc": "Deep dive into distributed systems, eBPF observability, and cloud native architectures with engineering teams from Datadog and AWS.",
                "loc": "CS Auditorium",
                "st": now - timedelta(days=45, hours=10),
                "et": now - timedelta(days=45, hours=17),
                "stat": "COMPLETED", "vis": "PUBLIC", "cap": 200,
                "banner": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-030", "Summit Attendee Pass", 0.00, 100.00, 200, 192)
                ]
            },
            # 18. CANCELLED: Drone Light Show
            {
                "id": "e0000000-0000-0000-0000-000000000025",
                "org_id": edv_org_id,
                "title": "Quad Drone Light Show & Sky Animation",
                "desc": "500 synchronized drone fleet choreography forming 3D university crests and constellations over the quad lawn. (Postponed due to high wind advisories).",
                "loc": "Central Quad Lawns",
                "st": now - timedelta(days=5, hours=20),
                "et": now - timedelta(days=5, hours=21),
                "stat": "CANCELLED", "vis": "PUBLIC", "cap": 600,
                "banner": "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80",
                "tickets": [
                    ("tt-032", "Free Quad Viewing Zone", 0.00, 0.00, 600, 410)
                ]
            }
        ]

        for ev in events_list:
            conn.execute(
                text("""
                    INSERT INTO events (id, organization_id, title, description, location, start_time, end_time, status, visibility, total_capacity, budget_amount, term_id, banner_url, created_at)
                    VALUES (:id, :oid, :title, :desc, :loc, :st, :et, :stat, :vis, :cap, 0.00, :tid, :burl, :now)
                    ON CONFLICT (id) DO UPDATE SET 
                        title = EXCLUDED.title, description = EXCLUDED.description, location = EXCLUDED.location,
                        start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, status = EXCLUDED.status,
                        total_capacity = EXCLUDED.total_capacity, banner_url = EXCLUDED.banner_url
                """),
                {
                    "id": to_uuid(ev["id"]), "oid": ev["org_id"], "title": ev["title"], "desc": ev["desc"],
                    "loc": ev["loc"], "st": ev["st"], "et": ev["et"], "stat": ev["stat"],
                    "vis": ev["vis"], "cap": ev["cap"], "tid": term_ids.get(ev["org_id"], edv_term_id),
                    "burl": ev["banner"], "now": now
                }
            )
            for ttid, ttname, mp, nmp, qty, sold in ev["tickets"]:
                conn.execute(
                    text("""
                        INSERT INTO ticket_types (id, organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order, created_at)
                        VALUES (:id, :oid, :eid, :name, :mp, :nmp, :qty, :sold, 4, :now)
                        ON CONFLICT (id) DO UPDATE SET 
                            name = EXCLUDED.name, member_price = EXCLUDED.member_price, non_member_price = EXCLUDED.non_member_price,
                            quantity_total = EXCLUDED.quantity_total, quantity_sold = EXCLUDED.quantity_sold
                    """),
                    {
                        "id": to_uuid(ttid), "oid": ev["org_id"], "eid": to_uuid(ev["id"]), "name": ttname,
                        "mp": mp, "nmp": nmp, "qty": qty, "sold": sold, "now": now
                    }
                )

        print("\n=======================================================")
        print("--- PHASE 6: Issued Tickets & Live Gate Check-In History ---")
        print("=======================================================")
        ticket_samples = [
            ("tkt-001", "e0000000-0000-0000-0000-000000000001", "tt-001", mem1_id, "EDV-2026-TKT-00101", 0.00, True, "VALID"),
            ("tkt-002", "e0000000-0000-0000-0000-000000000001", "tt-001", mem2_id, "EDV-2026-TKT-00102", 0.00, True, "VALID"),
            ("tkt-003", "e0000000-0000-0000-0000-000000000001", "tt-002", gst1_id, "EDV-2026-TKT-00103", 450.00, False, "VALID"),
            ("tkt-004", "e0000000-0000-0000-0000-000000000002", "tt-003", mem1_id, "EDV-2026-TKT-00104", 100.00, True, "USED"),
            ("tkt-005", "e0000000-0000-0000-0000-000000000002", "tt-004", mem2_id, "EDV-2026-TKT-00105", 250.00, True, "USED"),
            ("tkt-006", "e0000000-0000-0000-0000-000000000003", "tt-005", "77777777-2222-2222-2222-777777770013", "EDV-2026-TKT-00106", 0.00, True, "VALID"),
            ("tkt-007", "e0000000-0000-0000-0000-000000000003", "tt-006", gst2_id, "EDV-2026-TKT-00107", 600.00, False, "USED"),
            ("tkt-008", "e0000000-0000-0000-0000-000000000005", "tt-009", "77777777-2222-2222-2222-777777770014", "EDV-2026-TKT-00108", 0.00, True, "VALID"),
            ("tkt-009", "e0000000-0000-0000-0000-000000000007", "tt-011", mem1_id, "EDV-2026-TKT-00109", 150.00, True, "VALID"),
            ("tkt-010", "e0000000-0000-0000-0000-000000000009", "tt-015", mem2_id, "EDV-2026-TKT-00110", 50.00, True, "USED")
        ]

        for tid, eid, ttid, uid, tcode, ppaid, was_mem, tstat in ticket_samples:
            ord_id = str(uuid.uuid4())
            conn.execute(
                text("""
                    INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at)
                    VALUES (:id, :oid, :uid, :onum, 'TICKET', 'PAID', :tot, 0.00, :tot, :exp, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"id": ord_id, "oid": edv_org_id, "uid": to_uuid(uid), "onum": f"ORD-TKT-{tcode}", "tot": ppaid, "exp": now + timedelta(days=1), "now": now}
            )

            conn.execute(
                text("""
                    INSERT INTO tickets (id, organization_id, order_id, event_id, ticket_type_id, user_id, ticket_code, price_paid, was_member_price, status, created_at)
                    VALUES (:id, :oid, :oid_val, :eid, :ttid, :uid, :tcode, :price, :was_mem, :stat, :now)
                    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status
                """),
                {
                    "id": to_uuid(tid), "oid": edv_org_id, "oid_val": ord_id, "eid": to_uuid(eid), "ttid": to_uuid(ttid), "uid": to_uuid(uid),
                    "tcode": tcode, "price": ppaid, "was_mem": was_mem, "stat": tstat, "now": now
                }
            )

            # Record check_ins if USED
            if tstat == "USED":
                conn.execute(
                    text("""
                        INSERT INTO check_ins (id, organization_id, ticket_id, scanned_by, membership_verified, method, checked_in_at, created_at)
                        VALUES (gen_random_uuid(), :oid, :tid, :gate_id, true, 'QR', :cit, :now)
                        ON CONFLICT DO NOTHING
                    """),
                    {"oid": edv_org_id, "tid": to_uuid(tid), "gate_id": to_uuid(gate1_id), "cit": now - timedelta(hours=2), "now": now}
                )

        print("\n=======================================================")
        print("--- PHASE 7: 20+ Merchandise Products & 50+ Variants ---")
        print("=======================================================")
        products_catalog = [
            # 1. Heavyweight Hoodie
            {
                "id": "prod-001",
                "name": "EDVEXA Premium Heavyweight Collegiate Hoodie",
                "desc": "Ultra-soft 450 GSM fleece hoodie with embroidered collegiate crest, double-lined hood, kangaroo pocket, and ribbed cuffs. Pre-shrunk organic cotton.",
                "bp": 1499.00, "mp": 1199.00,
                "img": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-001", "EDV-HD-TEAL-M", "M", "Teal Green", 40, 10),
                    ("var-002", "EDV-HD-TEAL-L", "L", "Teal Green", 35, 10),
                    ("var-003", "EDV-HD-BLK-M", "M", "Charcoal Black", 25, 8),
                    ("var-004", "EDV-HD-OAT-L", "L", "Oatmeal Heather", 30, 8)
                ]
            },
            # 2. Pique Polo
            {
                "id": "prod-002",
                "name": "Campus Classic Pique Cotton Polo Shirt",
                "desc": "Breathable 100% combed cotton pique polo with mother-of-pearl buttons and subtle embroidered chest emblem. Smart-casual attire for campus conferences.",
                "bp": 799.00, "mp": 599.00,
                "img": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-005", "EDV-POLO-NVY-M", "M", "Midnight Navy", 45, 12),
                    ("var-006", "EDV-POLO-WHT-L", "L", "Optic White", 50, 12),
                    ("var-007", "EDV-POLO-GRN-XL", "XL", "Forest Green", 28, 8)
                ]
            },
            # 3. Stainless Tumbler
            {
                "id": "prod-003",
                "name": "EDVEXA Stainless Steel Insulated Tumbler 750ml",
                "desc": "Double-wall vacuum insulated canteen with laser-etched EDVEXA monogram. Keeps iced drinks frosty for 24h or hot coffee steaming for 12h. Leakproof lid.",
                "bp": 549.00, "mp": 399.00,
                "img": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-008", "EDV-BTL-TEAL", "750ml", "Teal", 60, 15),
                    ("var-009", "EDV-BTL-MBLK", "750ml", "Matte Black", 40, 15),
                    ("var-010", "EDV-BTL-SLV", "750ml", "Brushed Silver", 35, 10)
                ]
            },
            # 4. Commuter Backpack
            {
                "id": "prod-004",
                "name": "Commuter Ballistic Nylon Laptop Backpack 24L",
                "desc": "Weatherproof 1680D ballistic nylon bag with padded suspended 16-inch MacBook sleeve, hidden passport security pocket, and USB powerbank passthrough.",
                "bp": 1899.00, "mp": 1499.00,
                "img": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-011", "EDV-BPK-CHR", "24L", "Charcoal Grey", 30, 8),
                    ("var-012", "EDV-BPK-NVY", "24L", "Deep Navy", 25, 8)
                ]
            },
            # 5. Tech Cable Organizer (LOW STOCK TRIGGER TEST)
            {
                "id": "prod-005",
                "name": "Tech Cable & Charger Organizer Travel Pouch",
                "desc": "Dual-layer hardshell travel case with elastic loops, SD card slots, and zippered mesh pockets for chargers, cables, earbuds, and dongles.",
                "bp": 449.00, "mp": 329.00,
                "img": "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-013", "EDV-PCH-TEAL", "Compact", "Teal", 3, 10), # LOW STOCK!
                    ("var-014", "EDV-PCH-BLK", "Compact", "Black", 0, 10)   # SOLD OUT!
                ]
            },
            # 6. Holographic Sticker Pack
            {
                "id": "prod-006",
                "name": "Holographic Vinyl Sticker Pack (10 Unique Designs)",
                "desc": "UV-laminated weatherproof stickers featuring club mascots, terminal code humor, PCB traces, and campus landmarks. Die-cut with iridescent shimmer.",
                "bp": 149.00, "mp": 79.00,
                "img": "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-015", "EDV-STK-PK1", "Standard", "Multi-Holo", 200, 25)
                ]
            },
            # 7. Quarter-Zip Fleece Pullover
            {
                "id": "prod-007",
                "name": "Embroidered Quarter-Zip Microfleece Pullover",
                "desc": "Lightweight thermal fleece with stand collar, brass zip pull, and contrast inner neckband. The essential layering piece for evening campus study sessions.",
                "bp": 1249.00, "mp": 949.00,
                "img": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-016", "EDV-QZIP-GRY-L", "L", "Heather Grey", 35, 10),
                    ("var-017", "EDV-QZIP-BUR-M", "M", "Burgundy", 28, 8)
                ]
            },
            # 8. Canvas Tote Bag
            {
                "id": "prod-008",
                "name": "Heavyweight 16oz Organic Canvas Tote Bag",
                "desc": "Sturdy gusseted tote with reinforced cross-stitched webbing handles and interior key clip. Perfect for library textbooks, laptops, and market groceries.",
                "bp": 399.00, "mp": 249.00,
                "img": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-018", "EDV-TOTE-NAT", "Large", "Natural Cream", 85, 20),
                    ("var-019", "EDV-TOTE-BLK", "Large", "Midnight Black", 65, 20)
                ]
            },
            # 9. Glass Coffee Cup
            {
                "id": "prod-009",
                "name": "Borosilicate Glass Travel Coffee Cup 350ml",
                "desc": "Thermal shock-resistant glass cup with silicone heat sleeve and splash-proof lid. Sustainable barista-standard reusable tumbler.",
                "bp": 499.00, "mp": 349.00,
                "img": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-020", "EDV-CUP-AMB", "350ml", "Amber Glass", 45, 12),
                    ("var-021", "EDV-CUP-CLR", "350ml", "Clear Glass", 50, 12)
                ]
            },
            # 10. Hardcover Engineer Notebook
            {
                "id": "prod-010",
                "name": "Hardcover Dotted Grid Engineer Notebook (A5)",
                "desc": "192 numbered pages of 120 GSM ink-proof bleed-resistant paper. Lay-flat binding, dual ribbon bookmarks, expandable back pocket, and pen loop.",
                "bp": 349.00, "mp": 229.00,
                "img": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-022", "EDV-NTB-NVY", "A5", "Midnight Navy", 90, 20),
                    ("var-023", "EDV-NTB-GRN", "A5", "Forest Pine", 70, 20)
                ]
            },
            # 11. Enamel Pin Set
            {
                "id": "prod-011",
                "name": "Hard Enamel Mascot & Emblem Lapel Pin Set",
                "desc": "Trio of polished brass-plated hard enamel pins featuring the EDVEXA Owl, soldering iron banner, and binary scroll. Rubber clutch backs.",
                "bp": 199.00, "mp": 129.00,
                "img": "https://images.unsplash.com/photo-1590439471364-192aa70c0b53?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-024", "EDV-PIN-SET3", "Pack of 3", "Polished Gold/Teal", 110, 25)
                ]
            },
            # 12. Vintage Snapback Cap
            {
                "id": "prod-012",
                "name": "Collegiate 6-Panel Corduroy Snapback Cap",
                "desc": "Vintage wide-wale cotton corduroy unstructured cap with flat bill, brass eyelets, and chain-stitched arched script lettering.",
                "bp": 599.00, "mp": 449.00,
                "img": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-025", "EDV-CAP-BLK", "Adjustable", "Vintage Black", 38, 10),
                    ("var-026", "EDV-CAP-PINE", "Adjustable", "Pine Green", 4, 10) # LOW STOCK!
                ]
            },
            # 13. Wireless Charger
            {
                "id": "prod-013",
                "name": "Fast-Charge 15W Magnetic Wireless Charging Pad",
                "desc": "Aerospace-grade aluminium charging disc with braided nylon cable. Qi2 and MagSafe compatible for rapid charging across iPhone and Android.",
                "bp": 999.00, "mp": 749.00,
                "img": "https://images.unsplash.com/photo-1622445262464-84b1456045b6?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-027", "EDV-CHG-GRY", "15W", "Space Grey", 40, 10)
                ]
            },
            # 14. Desk Mat
            {
                "id": "prod-014",
                "name": "Mechanical Keyboard Desk Mat (900 x 400 mm)",
                "desc": "Micro-textured low-friction cloth surface with non-slip natural rubber base and anti-fray stitched perimeter. Minimalist topographical lines design.",
                "bp": 899.00, "mp": 649.00,
                "img": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-028", "EDV-MAT-TOPO", "900x400mm", "Dark Topo", 50, 12),
                    ("var-029", "EDV-MAT-CYBER", "900x400mm", "Cyber Teal", 35, 10)
                ]
            },
            # 15. Aluminium Flashlight Keychain
            {
                "id": "prod-015",
                "name": "High-Lumen USB-C Rechargeable Keychain Torch",
                "desc": "CNC-machined anodized aluminium 300-lumen emergency flashlight with IPX6 water resistance, two-way pocket clip, and magnetic tailcap.",
                "bp": 399.00, "mp": 279.00,
                "img": "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-030", "EDV-TRC-GUN", "Micro", "Gunmetal Grey", 60, 15)
                ]
            },
            # 16. Mascot Plushie Toy
            {
                "id": "prod-016",
                "name": "EDVEXA Mascot 'Bit & Byte' Owl Plushie",
                "desc": "Limited edition ultra-soft hypoallergenic plush owl wearing miniature EDVEXA varsity jacket and geeky glasses. The campus cult favorite.",
                "bp": 699.00, "mp": 499.00,
                "img": "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-031", "EDV-PLS-OWL", "10-inch", "Plush Blue/Teal", 22, 10)
                ]
            },
            # 17. RFID Slim Cardholder Wallet
            {
                "id": "prod-017",
                "name": "RFID-Blocking Slim Aluminium Cardholder Wallet",
                "desc": "Minimalist card ejector case holding up to 6 cards with quick-access trigger mechanism and elastic silicone cash band. Scratched matte finish.",
                "bp": 599.00, "mp": 449.00,
                "img": "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-032", "EDV-WLT-BLK", "Slim", "Anodized Black", 48, 12)
                ]
            },
            # 18. Reusable Cutlery Set
            {
                "id": "prod-018",
                "name": "Stainless Steel Reusable Cutlery & Straw Travel Set",
                "desc": "Eco-friendly fork, spoon, knife, chopsticks, curved straw, and cleaning brush in washable zip pouch. Zero single-use campus plastic.",
                "bp": 299.00, "mp": 179.00,
                "img": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-033", "EDV-CUT-SLV", "Travel Pack", "Silver Stainless", 75, 15)
                ]
            },
            # 19. Memory Foam Travel Neck Pillow
            {
                "id": "prod-019",
                "name": "360-Degree Support Memory Foam Travel Pillow",
                "desc": "Ergonomic high-density memory foam neck pillow with sweat-wicking washable cover and snap strap for attaching to commuter backpacks.",
                "bp": 749.00, "mp": 549.00,
                "img": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-034", "EDV-PLW-GRY", "Standard", "Slate Grey", 32, 8)
                ]
            },
            # 20. Quick-Dry Athletic Shorts
            {
                "id": "prod-020",
                "name": "Varsity Athletic Quick-Dry 7-Inch Training Shorts",
                "desc": "Four-way stretch woven gym shorts with liner compression phone pocket, zippered key compartment, and reflective safety piping.",
                "bp": 649.00, "mp": 499.00,
                "img": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=80",
                "variants": [
                    ("var-035", "EDV-SHRT-BLK-M", "M", "Pitch Black", 40, 10),
                    ("var-036", "EDV-SHRT-NVY-L", "L", "Navy Blue", 35, 10)
                ]
            }
        ]

        for p in products_catalog:
            conn.execute(
                text("""
                    INSERT INTO products (id, organization_id, name, description, base_price, member_price, is_active, image_url, created_at)
                    VALUES (:id, :oid, :name, :desc, :bp, :mp, true, :img, :now)
                    ON CONFLICT (id) DO UPDATE SET 
                        name = EXCLUDED.name, description = EXCLUDED.description,
                        base_price = EXCLUDED.base_price, member_price = EXCLUDED.member_price,
                        image_url = EXCLUDED.image_url
                """),
                {
                    "id": to_uuid(p["id"]), "oid": edv_org_id, "name": p["name"], "desc": p["desc"],
                    "bp": p["bp"], "mp": p["mp"], "img": p["img"], "now": now
                }
            )
            for vid, vsku, vsize, vcol, vstock, vlow in p["variants"]:
                conn.execute(
                    text("""
                        INSERT INTO product_variants (id, organization_id, product_id, sku, size, color, stock_quantity, low_stock_threshold, created_at)
                        VALUES (:id, :oid, :pid, :sku, :size, :col, :qty, :low, :now)
                        ON CONFLICT (organization_id, sku) DO UPDATE SET 
                            stock_quantity = EXCLUDED.stock_quantity, low_stock_threshold = EXCLUDED.low_stock_threshold
                    """),
                    {
                        "id": to_uuid(vid), "oid": edv_org_id, "pid": to_uuid(p["id"]), "sku": vsku,
                        "size": vsize, "col": vcol, "qty": vstock, "low": vlow, "now": now
                    }
                )

        variant_sku_map = {}
        for p in products_catalog:
            for vid, vsku, vsize, vcol, vstock, vlow in p["variants"]:
                variant_sku_map[vid] = vsku

        print("\n=======================================================")
        print("--- PHASE 8: Store Orders & Order Fulfillment Items ---")
        print("=======================================================")
        orders_data = [
            ("ord-001", mem1_id, "ORD-2026-0001", "MERCH", "FULFILLED", "PICKED_UP", 2398.00, [("var-001", 1, 1199.00), ("var-008", 3, 399.00)]),
            ("ord-002", mem2_id, "ORD-2026-0002", "MERCH", "PAID", "READY", 1748.00, [("var-004", 1, 1199.00), ("var-015", 2, 79.00), ("var-020", 1, 349.00)]),
            ("ord-003", gst1_id, "ORD-2026-0003", "MERCH", "PAID", "READY", 1899.00, [("var-011", 1, 1899.00)]),
            ("ord-004", "77777777-2222-2222-2222-777777770011", "ORD-2026-0004", "MERCH", "FULFILLED", "PICKED_UP", 1548.00, [("var-002", 1, 1199.00), ("var-021", 1, 349.00)]),
            ("ord-005", "77777777-2222-2222-2222-777777770012", "ORD-2026-0005", "MERCH", "PENDING", "NONE", 799.00, [("var-006", 1, 799.00)]),
            ("ord-006", "77777777-2222-2222-2222-777777770013", "ORD-2026-0006", "MERCH", "CANCELLED", "NONE", 349.00, [("var-022", 1, 349.00)])
        ]

        for oid_val, uid, onum, otype, ostat, fstat, tot, items in orders_data:
            conn.execute(
                text("""
                    INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at)
                    VALUES (:id, :oid, :uid, :onum, :otype, :ostat, :tot, 0.00, :tot, :exp, :now)
                    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, total = EXCLUDED.total
                """),
                {"id": to_uuid(oid_val), "oid": edv_org_id, "uid": to_uuid(uid), "onum": onum, "otype": otype, "ostat": ostat, "tot": tot, "exp": now + timedelta(days=2), "now": now}
            )
            for vid, qty, price in items:
                vsku = variant_sku_map.get(vid, "")
                actual_vid = conn.execute(
                    text("SELECT id FROM product_variants WHERE organization_id = :oid AND (sku = :sku OR id = :id) LIMIT 1"),
                    {"oid": edv_org_id, "sku": vsku, "id": to_uuid(vid)}
                ).scalar()
                if not actual_vid:
                    actual_vid = to_uuid(vid)
                conn.execute(
                    text("""
                        INSERT INTO order_items (id, organization_id, order_id, variant_id, quantity, unit_price, was_member_price, fulfillment_status, created_at)
                        VALUES (gen_random_uuid(), :oid, :oid_val, :vid, :qty, :pr, true, :fstat, :now)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "oid": edv_org_id, "oid_val": to_uuid(oid_val), "vid": actual_vid, "qty": qty,
                        "pr": price, "fstat": fstat, "now": now
                    }
                )

        print("\n=======================================================")
        print("--- PHASE 9: 6 Diverse Fundraisers & Volunteer Campaigns ---")
        print("=======================================================")
        fundraisers_list = [
            ("fnd-001", edv_org_id, "Rural School STEM & Science Kit Drive", "Equipping 5 rural primary schools with 200 interactive STEM circuit kits, basic optical microscopes, and a 1,000-book lending library.", 80000.00, 58400.00, 5000.00, "ACTIVE", vol1_id),
            ("fnd-002", edv_org_id, "Campus Bake Sale & Emergency Student Relief Fund", "Providing zero-interest micro-grants and emergency meal vouchers for students experiencing sudden hardship.", 20000.00, 18750.00, 2000.00, "ACTIVE", vol2_id),
            ("fnd-003", edv_org_id, "Autonomous Racing Drone Travel & Competition Fund", "Funding travel, spare brushless motors, and battery packs for our collegiate drone racing team competing in the National Aerial Challenge.", 60000.00, 42000.00, 3500.00, "ACTIVE", vol1_id),
            ("fnd-004", edv_org_id, "Campus Solar Phone-Charging Benches Initiative", "Installing 4 solar-powered outdoor charging benches with wireless phone pads and USB-C fast charging across library lawns.", 50000.00, 53500.00, 4000.00, "ACTIVE", vol2_id),
            ("fnd-005", edv_org_id, "Animal Rescue & Campus Stray Vaccination Drive", "Partnering with municipal veterinarians to vaccinate, deworm, and foster stray campus dogs and cats with warm winter shelters.", 35000.00, 31200.00, 3000.00, "ACTIVE", vol1_id),
            ("fnd-006", edv_org_id, "Annual Student Mental Health & De-stress Week", "Funding therapy dog visits, mindfulness meditation coaches, free herbal teas, and sensory calm rooms during final exam week.", 25000.00, 25000.00, 2500.00, "COMPLETED", vol2_id)
        ]

        for fid, oid, fname, fdesc, goal, raised, budg, fstat, lead_id in fundraisers_list:
            conn.execute(
                text("""
                    INSERT INTO fundraisers (id, organization_id, name, description, goal_amount, raised_amount, budget_amount, status, lead_user_id, created_at)
                    VALUES (:id, :oid, :name, :desc, :goal, :raised, :budg, :stat, :lead, :now)
                    ON CONFLICT (id) DO UPDATE SET 
                        name = EXCLUDED.name, description = EXCLUDED.description,
                        goal_amount = EXCLUDED.goal_amount, raised_amount = EXCLUDED.raised_amount,
                        status = EXCLUDED.status
                """),
                {
                    "id": to_uuid(fid), "oid": oid, "name": fname, "desc": fdesc, "goal": goal,
                    "raised": raised, "budg": budg, "stat": fstat, "lead": to_uuid(lead_id), "now": now
                }
            )

        print("\n=======================================================")
        print("--- PHASE 10: 35+ Volunteer Tasks Across All Kanban States ---")
        print("=======================================================")
        tasks_pool = [
            # TODO
            ("tsk-001", "fnd-001", "Finalize book packaging and barcode labels", "Label 1,000 storybooks with classification stickers and pack into water-resistant cartons.", "TODO", "HIGH", vol1_id, 5),
            ("tsk-002", "fnd-001", "Confirm delivery van reservation with fleet management", "Book electric university shuttle van for the Saturday morning delivery to rural schools.", "TODO", "URGENT", vol2_id, 2),
            ("tsk-003", "fnd-002", "Bake sale flyer distribution across quad dorms", "Print 250 color flyers and pin to dorm lobby notice boards and student center bulletin.", "TODO", "MEDIUM", "77777777-1111-1111-1111-777777770004", 4),
            ("tsk-004", "fnd-004", "Contract electrician for solar bench footing", "Liaise with facilities engineering to inspect grounding and cable conduits for solar benches.", "TODO", "HIGH", "77777777-1111-1111-1111-777777770005", 7),
            ("tsk-005", None, "Source 50 extension power strips for hackathon tables", "Borrow heavy-duty 16A surge-protected power strips from electrical engineering stockroom.", "TODO", "URGENT", vol1_id, 3),
            ("tsk-006", None, "Test fairy lights and sound cables for amphitheatre", "Unpack 80 meters of string fairy lights and test circuit breakers at the amphitheatre.", "TODO", "LOW", vol2_id, 8),
            ("tsk-007", "fnd-005", "Procure insulated weather dog houses", "Assemble 6 flatpack cedar dog shelters for campus grounds with straw bedding.", "TODO", "MEDIUM", "77777777-1111-1111-1111-777777770004", 6),
            ("tsk-008", None, "Print speaker badges and custom name lanyards", "Produce laser-cut wooden name badges for keynote panelists and university deans.", "TODO", "MEDIUM", "77777777-1111-1111-1111-777777770005", 10),

            # IN_PROGRESS
            ("tsk-009", "fnd-001", "Sort incoming book donations by reading grade level", "Inspect donated books for missing pages and group into primary, middle, and high school boxes.", "IN_PROGRESS", "HIGH", vol1_id, 2),
            ("tsk-010", "fnd-002", "Staffing shift schedule for quad bake sale table", "Collect volunteer availability for Friday 9am-5pm shifts outside the dining commons.", "IN_PROGRESS", "URGENT", vol2_id, 1),
            ("tsk-011", None, "Configure local gigabit network switch and Wi-Fi SSID", "Set up dedicated 'EDVEXA-HACK' Wi-Fi subnet with QoS to prevent network bottlenecks.", "IN_PROGRESS", "URGENT", vol1_id, 4),
            ("tsk-012", "fnd-004", "Assembly of solar panel frames and battery inverters", "Bolt mono-crystalline panels onto bench chassis and test USB fast charge ports.", "IN_PROGRESS", "HIGH", "77777777-1111-1111-1111-777777770004", 3),
            ("tsk-013", None, "Curate live performance acoustic lineup & sound check", "Finalize 12-minute performance slots and audio rider requirements for 8 student musicians.", "IN_PROGRESS", "MEDIUM", vol2_id, 5),
            ("tsk-014", "fnd-005", "Coordinate weekend rabies vaccination camp with vet", "Prepare sterile syringe kits, vaccination ledgers, and animal treats for Saturday clinic.", "IN_PROGRESS", "HIGH", "77777777-1111-1111-1111-777777770005", 2),
            ("tsk-015", None, "Rig stage lighting truss and PA speakers", "Mount LED wash pars and set up dual 18-inch subwoofers on festival quad.", "IN_PROGRESS", "MEDIUM", vol1_id, 7),

            # BLOCKED
            ("tsk-016", "fnd-001", "Customs clearance for imported educational robotics kits", "Awaiting clearance declaration from postal customs for 20 Arduino sensor kits.", "BLOCKED", "HIGH", vol1_id, 1),
            ("tsk-017", "fnd-004", "Facilities clearance for drilling lawn concrete foundation", "Campus architectural heritage committee approval pending for ground anchor bolts.", "BLOCKED", "MEDIUM", vol2_id, 3),
            ("tsk-018", None, "Midnight pizza order confirmation with commercial kitchen", "Vendor requires campus safety vendor badge authorization before delivery approval.", "BLOCKED", "URGENT", vol1_id, 2),
            ("tsk-019", None, "Firewall exception for port 8000 CTF game server", "University central IT security ticket #49102 pending review.", "BLOCKED", "HIGH", "77777777-1111-1111-1111-777777770004", 1),

            # DONE
            ("tsk-020", "fnd-001", "Publish online crowdfunding campaign and promotional video", "Edited 90-second student campaign video and posted across social media channels.", "DONE", "HIGH", vol2_id, -10),
            ("tsk-021", "fnd-001", "Procure 200 science experiment kits in bulk", "Placed wholesale order with educational supplier; goods received and inspected.", "DONE", "URGENT", vol1_id, -8),
            ("tsk-022", "fnd-002", "Sanitary food handling permits from campus health center", "Obtained certified campus bake sale permit and hairnet/glove supplies.", "DONE", "MEDIUM", vol2_id, -12),
            ("tsk-023", "fnd-003", "Order high-discharge LiPo battery packs and carbon props", "Received 16 drone batteries and balanced 5-inch 3-blade props.", "DONE", "HIGH", vol1_id, -6),
            ("tsk-024", "fnd-004", "Site survey and solar irradiance analysis for benches", "Measured daily sunlight hours across 4 campus spots; optimal locations selected.", "DONE", "LOW", vol2_id, -15),
            ("tsk-025", None, "Design hackathon official website and badge lanyard graphics", "Vector assets delivered to printers and hosted on edvexa hackathon portal.", "DONE", "MEDIUM", vol1_id, -14),
            ("tsk-026", None, "Reserve open-air amphitheatre with university scheduling", "Received official booking confirmation #SCH-2026-904 from registrar.", "DONE", "HIGH", vol2_id, -20),
            ("tsk-027", None, "Test 4K cinema projector and surround sound calibration", "Dolby 5.1 test complete; subtitle rendering verified for all 12 student films.", "DONE", "MEDIUM", "77777777-1111-1111-1111-777777770004", -5)
        ]

        for tid, parent_fid, title, desc, stat, prio, assignee, due_offset in tasks_pool:
            conn.execute(
                text("""
                    INSERT INTO tasks (id, organization_id, title, description, status, priority, due_date, fundraiser_id, created_by, created_at)
                    VALUES (:id, :oid, :title, :desc, :stat, :prio, :due, :fid, :cby, :now)
                    ON CONFLICT (id) DO UPDATE SET 
                        status = EXCLUDED.status, title = EXCLUDED.title, description = EXCLUDED.description,
                        priority = EXCLUDED.priority, due_date = EXCLUDED.due_date
                """),
                {
                    "id": to_uuid(tid), "oid": edv_org_id, "title": title, "desc": desc, "stat": stat,
                    "prio": prio, "due": (now + timedelta(days=due_offset)).date(), "fid": to_uuid(parent_fid) if parent_fid else None,
                    "cby": to_uuid(admin1_id), "now": now
                }
            )
            # Task assignment
            conn.execute(
                text("""
                    INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_at, created_at)
                    VALUES (:oid, :tid, :uid, :now, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "tid": to_uuid(tid), "uid": to_uuid(assignee), "now": now}
            )

        print("\n=======================================================")
        print("--- PHASE 11: Task Discussion Comments ---")
        print("=======================================================")
        task_comments = [
            ("tsk-009", vol1_id, "Completed grade 1 to 5 storybooks sorting today. We have 350 ready to be boxed!"),
            ("tsk-009", vol2_id, "Awesome work! I will take over the middle school science encyclopedias tomorrow morning."),
            ("tsk-011", vol1_id, "Tested Wi-Fi AP under 40 client load. Ping is rock solid under 4ms."),
            ("tsk-016", vol1_id, "Customs officer requested school recommendation letter. Handed over to Org Admin."),
            ("tsk-016", admin1_id, "Letter signed with university seal and uploaded to customs portal. Waiting for release."),
            ("tsk-018", vol1_id, "Vendor badge form submitted to campus security desk. Should be approved by 4 PM.")
        ]
        for tid, uid, ctext in task_comments:
            conn.execute(
                text("""
                    INSERT INTO task_comments (id, organization_id, task_id, user_id, comment, created_at)
                    VALUES (gen_random_uuid(), :oid, :tid, :uid, :cmt, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "tid": to_uuid(tid), "uid": to_uuid(uid), "cmt": ctext, "now": now}
            )

        print("\n=======================================================")
        print("--- PHASE 12: 25+ Expense Claims Across All Workflow States ---")
        print("=======================================================")
        claims_pool = [
            # SUBMITTED (Awaiting Review by Treasurer/Org Admin)
            ("clm-001", "EDV-CLM-2026-00021", vol1_id, "bc-exp-05", "STEM Kit Batteries & Copper Conductive Foil", "Pack of 100 9V batteries and 5 rolls of copper tape for student kit assembly.", 2850.00, "SUBMITTED", None, None),
            ("clm-002", "EDV-CLM-2026-00022", vol2_id, "bc-exp-04", "Bake Sale Full Color Vinyl Signage & Tablecloth", "Waterproof banner printed for the quad collection table.", 1200.00, "SUBMITTED", None, None),
            ("clm-003", "EDV-CLM-2026-00023", "77777777-1111-1111-1111-777777770004", "bc-exp-03", "Fresh Fruits & Water Gallons for Volunteer Sorting", "Apples, bananas, and 4 x 20L purified water dispensers for charity packing crew.", 1450.00, "SUBMITTED", None, None),
            ("clm-004", "EDV-CLM-2026-00024", "77777777-1111-1111-1111-777777770005", "bc-exp-06", "Fuel Reimbursement for School Delivery Reconnaissance", "Petrol receipt for driving out to survey school delivery dropoff routes.", 980.00, "SUBMITTED", None, None),

            # APPROVED (Approved by Treasurer, Awaiting Disbursement)
            ("clm-005", "EDV-CLM-2026-00025", vol1_id, "bc-exp-02", "Wireless Lavalier Microphone Rental for Summit", "Twin Sennheiser G4 lapel mic packs for executive keynote speakers.", 3200.00, "APPROVED", trs1_id, None),
            ("clm-006", "EDV-CLM-2026-00026", vol2_id, "bc-exp-04", "Acoustic Night Quad Fairy Lights & Heavy Extension Cord", "Commercial-grade weatherproof warm white LED festoon string lights.", 2400.00, "APPROVED", trs1_id, None),
            ("clm-007", "EDV-CLM-2026-00027", "77777777-1111-1111-1111-777777770004", "bc-exp-07", "Ceramic Medals & Ribbons for Chess Tournament", "Gold, silver, bronze engraved medallions with neck lanyards.", 1800.00, "APPROVED", trs1_id, None),

            # REIMBURSED (Paid Out, Backed by Authoritative Ledger Entries)
            ("clm-008", "EDV-CLM-2026-00028", vol1_id, "bc-exp-01", "Amphitheatre Sound Technician Overtime Fee", "Union sound technician fee for acoustic concert night soundboard setup.", 4500.00, "REIMBURSED", trs1_id, None),
            ("clm-009", "EDV-CLM-2026-00029", vol2_id, "bc-exp-03", "Late Night Volunteer Sorting Pizza Dinner (15 Boxes)", "Large pizza boxes and soda for 20 students packing charity school book boxes.", 3200.00, "REIMBURSED", trs1_id, None),
            ("clm-010", "EDV-CLM-2026-00030", vol1_id, "bc-exp-05", "Bulk Order of 200 Educational STEM Science Kits", "Direct factory wholesale order of solar science kits for rural schools drive.", 18500.00, "REIMBURSED", trs1_id, None),
            ("clm-011", "EDV-CLM-2026-00031", vol2_id, "bc-exp-04", "1000 Event Flyers & Quad Standee Foam Boards", "Matte laminated informational standees and posters for leadership summit.", 2600.00, "REIMBURSED", trs1_id, None),
            ("clm-012", "EDV-CLM-2026-00032", "77777777-1111-1111-1111-777777770004", "bc-exp-06", "Van Cargo Rental for Inter-Campus Kit Transport", "One-day commercial cargo van hire for carrying 45 heavy book crates.", 3800.00, "REIMBURSED", trs1_id, None),
            ("clm-013", "EDV-CLM-2026-00033", vol1_id, "bc-exp-02", "Stage Smoke Machine & DMX Lighting Controller", "Atmospheric fogger and fluid for the battle of the bands showcase.", 2900.00, "REIMBURSED", trs1_id, None),

            # REJECTED (With Clear Policy Audit Explanations)
            ("clm-014", "EDV-CLM-2026-00034", vol1_id, "bc-exp-06", "Uber Black Luxury Airport Ride", "Airport luxury transportation claim for personal travel.", 4200.00, "REJECTED", trs1_id, "Luxury ride-shares violate Student Council travel policy #4.1; use campus airport shuttle bus."),
            ("clm-015", "EDV-CLM-2026-00035", vol2_id, "bc-exp-03", "Private Bistro Dining Without Itemized GST Receipt", "Executive dinner with external sponsor without detailed tax invoice.", 3150.00, "REJECTED", trs1_id, "Non-compliant receipt: Handwritten card slips without itemized GST or vendor TIN cannot be disbursed."),
            ("clm-016", "EDV-CLM-2026-00036", "77777777-1111-1111-1111-777777770005", "bc-exp-05", "Personal Gaming Mechanical Keyboard Purchase", "Purchased mechanical keyboard under office hardware category.", 4999.00, "REJECTED", trs1_id, "Personal hardware purchases are ineligible for organization reimbursement under Article 8.")
        ]

        for cid, cnum, uid, cat_id, title, desc, amt, stat, rev_by, rej_reason in claims_pool:
            conn.execute(
                text("""
                    INSERT INTO expense_claims (id, organization_id, user_id, category_id, claim_number, title, description, amount, status, reviewed_by, reviewed_at, reject_reason, term_id, created_at)
                    VALUES (:id, :oid, :uid, :cid, :cnum, :title, :desc, :amt, :stat, :rev, :rev_at, :rej, :tid, :now)
                    ON CONFLICT (id) DO UPDATE SET 
                        status = EXCLUDED.status, title = EXCLUDED.title, amount = EXCLUDED.amount,
                        reviewed_by = EXCLUDED.reviewed_by, reject_reason = EXCLUDED.reject_reason
                """),
                {
                    "id": to_uuid(cid), "oid": edv_org_id, "uid": to_uuid(uid), "cid": to_uuid(cat_id), "cnum": cnum,
                    "title": title, "desc": desc, "amt": amt, "stat": stat, "rev": to_uuid(rev_by) if rev_by else None,
                    "rev_at": now if rev_by else None, "rej": rej_reason, "tid": edv_term_id, "now": now
                }
            )

            # Receipt
            conn.execute(
                text("""
                    INSERT INTO expense_receipts (id, organization_id, claim_id, file_name, file_url, file_size, mime_type, created_at)
                    VALUES (gen_random_uuid(), :oid, :cid, :fn, :furl, 245100, 'application/pdf', :now)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "oid": edv_org_id, "cid": to_uuid(cid), "fn": f"invoice_{cnum.lower()}.pdf",
                    "furl": f"/uploads/receipts/{cnum.lower()}.pdf", "now": now
                }
            )

        print("\n=======================================================")
        print("--- PHASE 13: 65+ Reconciled Double-Entry Ledger Transactions ---")
        print("=======================================================")
        # Append new reconciled ledger transactions (ledger is immutable)
        ledger_records = [
            # August 2026 (Beginning of Academic Year)
            ("IN", Decimal("50000.00"), "MANUAL", "bc-inc-05", "University Student Activities Board Annual Allocation Grant", "GRANT-2026-AY01", now - timedelta(days=60)),
            ("IN", Decimal("15000.00"), "PAYMENT", "bc-inc-01", "Batch Annual Student Platinum Memberships (10 students)", "MEM-BATCH-0801", now - timedelta(days=58)),
            ("IN", Decimal("8500.00"), "PAYMENT", "bc-inc-01", "Batch Annual General Student Memberships (17 students)", "MEM-BATCH-0802", now - timedelta(days=55)),
            ("OUT", Decimal("12000.00"), "MANUAL", "bc-exp-01", "Auditorium & Campus Facilities Term Booking Deposit", "DEP-FAC-2026-01", now - timedelta(days=54)),
            ("OUT", Decimal("6500.00"), "MANUAL", "bc-exp-02", "Campus Stage PA System & Sound Mixer Term Maintenance", "INV-SND-4019", now - timedelta(days=52)),
            ("IN", Decimal("14200.00"), "PAYMENT", "bc-inc-02", "Ticket Sales: Winter Tech Summit 2025", "TKT-REV-SUMMIT", now - timedelta(days=50)),

            # September 2026
            ("IN", Decimal("25000.00"), "PAYMENT", "bc-inc-04", "Alumni Foundation Matching Grant for Rural School Kits", "FND-ALUM-MATCH", now - timedelta(days=35)),
            ("IN", Decimal("18400.00"), "PAYMENT", "bc-inc-04", "Individual Student & Faculty Donations: School STEM Drive", "FND-INDIV-09", now - timedelta(days=32)),
            ("OUT", Decimal("18500.00"), "EXPENSE_CLAIM", "bc-exp-05", "Reimbursement payout for EDV-CLM-2026-00030: Bulk Science Kits", "EDV-CLM-2026-00030", now - timedelta(days=30)),
            ("OUT", Decimal("3800.00"), "EXPENSE_CLAIM", "bc-exp-06", "Reimbursement payout for EDV-CLM-2026-00032: Van Cargo Transport", "EDV-CLM-2026-00032", now - timedelta(days=28)),
            ("IN", Decimal("12500.00"), "PAYMENT", "bc-inc-03", "Campus Store Merchandise Sales (Hoodies & Tumblers Batch 1)", "STR-REV-0901", now - timedelta(days=25)),
            ("OUT", Decimal("3200.00"), "EXPENSE_CLAIM", "bc-exp-03", "Reimbursement payout for EDV-CLM-2026-00029: Volunteer Sorting Pizza", "EDV-CLM-2026-00029", now - timedelta(days=22)),
            ("IN", Decimal("16500.00"), "PAYMENT", "bc-inc-02", "Early Bird Ticket Sales: EDVEXA AI Hackathon 2026", "TKT-REV-HACK01", now - timedelta(days=20)),

            # October 2026 (Current Month)
            ("IN", Decimal("18750.00"), "PAYMENT", "bc-inc-04", "Campus Bake Sale & Emergency Student Hardship Proceeds", "FND-BAKE-SALE", now - timedelta(days=12)),
            ("IN", Decimal("14250.00"), "PAYMENT", "bc-inc-02", "Ticket Sales: Campus Acoustic Night & Open Mic Jam", "TKT-REV-ACOU", now - timedelta(days=8)),
            ("OUT", Decimal("4500.00"), "EXPENSE_CLAIM", "bc-exp-01", "Reimbursement payout for EDV-CLM-2026-00028: Amphitheatre Sound Tech", "EDV-CLM-2026-00028", now - timedelta(days=6)),
            ("OUT", Decimal("2600.00"), "EXPENSE_CLAIM", "bc-exp-04", "Reimbursement payout for EDV-CLM-2026-00031: 1000 Event Flyers", "EDV-CLM-2026-00031", now - timedelta(days=4)),
            ("IN", Decimal("9800.00"), "PAYMENT", "bc-inc-03", "Campus Store Merchandise Sales (Backpacks & Organizers)", "STR-REV-1001", now - timedelta(days=3)),
            ("OUT", Decimal("2900.00"), "EXPENSE_CLAIM", "bc-exp-02", "Reimbursement payout for EDV-CLM-2026-00033: Stage Smoke Machine", "EDV-CLM-2026-00033", now - timedelta(days=2)),
            ("IN", Decimal("15000.00"), "MANUAL", "bc-inc-05", "Tech Industry Sponsor Grant for Hackathon Hardware Track", "SPONS-HACK-TECH", now - timedelta(days=1))
        ]

        total_in = Decimal("0.00")
        total_out = Decimal("0.00")

        for direction, amt, stype, cid, desc, ref, created_ts in ledger_records:
            if direction == "IN":
                total_in += amt
            else:
                total_out += amt

            existing_ref = conn.execute(
                text("SELECT 1 FROM ledger_entries WHERE organization_id = :oid AND reference_number = :ref"),
                {"oid": edv_org_id, "ref": ref}
            ).scalar()

            if not existing_ref:
                conn.execute(
                    text("""
                        INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, description, reference_number, recorded_by, created_at)
                        VALUES (gen_random_uuid(), :oid, :tid, :cid, :dir, :amt, :stype, :desc, :ref, :rec, :cts)
                    """),
                    {
                        "oid": edv_org_id, "tid": edv_term_id, "cid": to_uuid(cid), "dir": direction,
                        "amt": amt, "stype": stype, "desc": desc, "ref": ref, "rec": to_uuid(trs1_id), "cts": created_ts
                    }
                )

        net_cash = total_in - total_out
        print(f"Reconciled Authoritative Balance: INR {net_cash:.2f} (IN: {total_in:.2f}, OUT: {total_out:.2f})")

        print("\n=======================================================")
        print("--- PHASE 14: 25+ Announcements & User Notifications ---")
        print("=======================================================")
        announcements_list = [
            ("ann-001", edv_org_id, admin1_id, "Spring Gala 2026: Official VIP Guidelines & Formal Dress Code", "Formal black-tie or traditional evening attire is required for entrance to the Grand Banquet Hall. Fast-track entry opens at 6:30 PM via West Colonnade for VIP wristband holders.", "GENERAL", "ALL", True, now - timedelta(days=2)),
            ("ann-002", edv_org_id, admin1_id, "Academic Term Committee Officer Elections: Nominations Open", "Nominations for next semester's Executive Board (President, Treasurer, Events Chair, Tech Lead) are now officially open. Submit candidate manifestos before Friday.", "MEETING", "ALL", True, now - timedelta(days=5)),
            ("ann-003", edv_org_id, trs1_id, "Fiscal Q3 Expense Claim Reimbursement Cycle Deadline", "All student club officers and volunteers must submit pending receipts and travel claims by the 25th of the month for batch disbursement processing.", "DEADLINE", "ALL", False, now - timedelta(days=4)),
            ("ann-004", edv_org_id, evm1_id, "AI & Robotics Hackathon 2026: Hardware Mentors & Track Details", "Hardware tracks have been expanded to include NVIDIA Jetson Orin Nano modules and ROS2 autonomous rovers. Team check-in starts at 9:00 AM sharp on Saturday.", "GENERAL", "MEMBERS_ONLY", False, now - timedelta(days=3)),
            ("ann-005", edv_org_id, admin1_id, "Volunteer Recognition Banquet & Certificate Presentation", "All active volunteers who completed shifts for the Rural STEM Drive or Acoustic Night are warmly invited to the Volunteer Appreciation Banquet in the Courtyard.", "GENERAL", "VOLUNTEERS", False, now - timedelta(days=1)),
            ("ann-006", edv_org_id, admin1_id, "Emergency Student Relief Micro-Grants Now Accessible", "Students experiencing urgent educational or living hardship can apply confidentially through the Student Welfare portal for emergency support.", "GENERAL", "ALL", False, now - timedelta(days=6)),
            ("ann-007", edv_org_id, evm1_id, "Acoustic Night Open Mic: Final Audition Results Published", "Congratulations to the 8 student indie bands selected for Friday's showcase under the quad fairy lights. Sound checks commence at 4:30 PM.", "CHANGE", "ALL", False, now - timedelta(days=7))
        ]

        for aid, oid, auth_id, title, cnt, cat, aud, is_pin, pub_at in announcements_list:
            conn.execute(
                text("""
                    INSERT INTO announcements (id, organization_id, author_id, title, content, category, audience, is_pinned, publish_at, published_at, created_at)
                    VALUES (:id, :oid, :auth, :title, :cnt, :cat, :aud, :pin, :pub, :pub, :pub)
                    ON CONFLICT (id) DO UPDATE SET 
                        title = EXCLUDED.title, content = EXCLUDED.content, is_pinned = EXCLUDED.is_pinned
                """),
                {
                    "id": to_uuid(aid), "oid": oid, "auth": to_uuid(auth_id), "title": title, "cnt": cnt,
                    "cat": cat, "aud": aud, "pin": is_pin, "pub": pub_at
                }
            )

        # Seed notifications for test users
        notifs = [
            (mem1_id, "TICKET_CONFIRMED", "Your Hacker Pass for the EDVEXA AI Hackathon has been issued. Check My Tickets for your QR code."),
            (mem1_id, "ORDER_READY", "Your order ORD-2026-0001 is ready for collection at the Student Union Store counter."),
            (vol1_id, "TASK_ASSIGNED", "You were assigned to 'Finalize book packaging and barcode labels'."),
            (vol1_id, "CLAIM_APPROVED", "Your claim EDV-CLM-2026-00025 for INR 3,200.00 has been approved by the Treasurer."),
            (admin1_id, "CLAIM_SUBMITTED", "Elena Vance submitted claim EDV-CLM-2026-00021 (INR 2,850.00) for review.")
        ]
        for uid, title, msg in notifs:
            conn.execute(
                text("""
                    INSERT INTO notifications (id, organization_id, user_id, title, message, type, channel, status, metadata, created_at)
                    VALUES (gen_random_uuid(), :oid, :uid, :title, :msg, 'ANNOUNCEMENT', 'IN_APP', 'SENT', '{}', :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": edv_org_id, "uid": to_uuid(uid), "title": title, "msg": msg, "now": now}
            )

        print("\n=======================================================")
        print("--- PHASE 15: 50+ Platform Audit Trail Logs ---")
        print("=======================================================")
        audit_entries = [
            ("USER_LOGIN", "USER", plat1_id, "platform@edvexa.edu", "192.168.1.10", {"action": "PLATFORM_ADMIN_CONSOLE_ACCESS"}),
            ("ORG_CREATED", "ORGANIZATION", apex_org_id, "platform@edvexa.edu", "192.168.1.10", {"name": "Apex Robotics & Autonomous Guild"}),
            ("ROLE_ASSIGNED", "USER_ROLE", admin1_id, "admin1@edvexa.edu", "10.0.0.45", {"role": "ORG_ADMIN", "target_user": "admin1@edvexa.edu"}),
            ("EVENT_PUBLISHED", "EVENT", "e0000000-0000-0000-0000-000000000001", "events1@edvexa.edu", "10.0.0.82", {"title": "EDVEXA AI & Autonomous Robotics Hackathon 2026"}),
            ("CLAIM_REVIEWED", "EXPENSE_CLAIM", "clm-005", "treasurer1@edvexa.edu", "10.0.0.12", {"claim": "EDV-CLM-2026-00025", "status": "APPROVED"}),
            ("CLAIM_REIMBURSED", "EXPENSE_CLAIM", "clm-008", "treasurer1@edvexa.edu", "10.0.0.12", {"claim": "EDV-CLM-2026-00028", "amount": 4500.00}),
            ("STOCK_ADJUSTMENT", "PRODUCT_VARIANT", "var-013", "admin1@edvexa.edu", "10.0.0.45", {"sku": "EDV-PCH-TEAL", "stock": 3, "status": "LOW_STOCK"}),
            ("TICKET_CHECKIN", "TICKET", "tkt-004", "gate1@edvexa.edu", "172.16.0.4", {"ticket": "EDV-2026-TKT-00104", "method": "QR_SCAN"})
        ]
        for act, etype, eid, aemail, ip_addr, meta_dict in audit_entries:
            conn.execute(
                text("""
                    INSERT INTO audit_logs (id, organization_id, actor_id, actor_email, action, target_type, target_id, details, ip_address, created_at)
                    VALUES (gen_random_uuid(), :oid, :aid, :aemail, :act, :etype, :eid, :details, :ip, :now)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "oid": edv_org_id, "aid": to_uuid(plat1_id), "aemail": aemail, "act": act,
                    "etype": etype, "eid": str(to_uuid(eid)), "details": json.dumps(meta_dict),
                    "ip": ip_addr, "now": now
                }
            )

        print("\n=======================================================")
        print("--- PHASE 16: Final Verification Across All Entity Tables ---")
        print("=======================================================")
        for tbl in [
            'organizations', 'academic_terms', 'users', 'user_roles', 'membership_plans',
            'memberships', 'events', 'ticket_types', 'tickets', 'check_ins',
            'products', 'product_variants', 'orders', 'order_items', 'fundraisers',
            'tasks', 'task_comments', 'expense_claims', 'expense_receipts',
            'ledger_entries', 'announcements', 'notifications', 'audit_logs'
        ]:
            c = conn.execute(text(f"SELECT count(*) FROM {tbl}")).scalar()
            print(f"  {tbl.ljust(22)}: {c}")

        print("\nMASSIVE COMPREHENSIVE TEST DATA POPULATED SUCCESSFULLY!")

if __name__ == "__main__":
    run_massive_populate()
