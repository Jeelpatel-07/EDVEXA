-- Idempotent seed; existing accounts and their passwords are never overwritten.
DO $seed_guard$ BEGIN
 PERFORM pg_advisory_xact_lock(2036100301);
 IF EXISTS(SELECT 1 FROM platform_settings WHERE key='seed_version') THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM users) THEN RAISE EXCEPTION 'Existing data found: seed skipped to preserve it. Use a separate empty database for sample data.'; END IF;
 EXECUTE $seed_data$
SET LOCAL app.allow_platform_admin_seed = 'on';
INSERT INTO roles (id, code, name, scope, is_system, is_assignable_via_api, created_by_role, description) VALUES
('11111111-1111-1111-1111-111111111101', 'PLATFORM_ADMIN', 'Platform Administrator', 'PLATFORM', true, false, 'NONE', 'Global platform governance and tenant operations. Seed only.'),
('11111111-1111-1111-1111-111111111102', 'ORG_ADMIN', 'Organization Administrator', 'ORGANIZATION', true, false, 'PLATFORM_ADMIN', 'Full control over club resources, staff roles, and settings.'),
('11111111-1111-1111-1111-111111111103', 'TREASURER', 'Treasurer', 'ORGANIZATION', true, true, 'ORG_ADMIN', 'Financial ledger, refunds, expense reviews and reimbursement payouts.'),
('11111111-1111-1111-1111-111111111104', 'EVENT_MANAGER', 'Event Manager', 'ORGANIZATION', true, true, 'ORG_ADMIN', 'Event management, ticketing, products, inventory, and read-only finance.'),
('11111111-1111-1111-1111-111111111105', 'GATE_STAFF', 'Gate Staff', 'ORGANIZATION', true, true, 'ORG_ADMIN', 'Door check-in and QR ticket scanning only.'),
('11111111-1111-1111-1111-111111111106', 'VOLUNTEER', 'Volunteer', 'ORGANIZATION', true, true, 'ORG_ADMIN', 'Assigned duties, task status updates, and expense submission.');

-- 13.2 PERMISSIONS
INSERT INTO permissions (id, code, scope, description) VALUES
-- Platform
('22222222-2222-2222-2222-222222222201', 'organization.create', 'PLATFORM', 'Create new tenant organizations'),
('22222222-2222-2222-2222-222222222202', 'organization.view', 'PLATFORM', 'View tenant organizations'),
('22222222-2222-2222-2222-222222222203', 'organization.update', 'PLATFORM', 'Update tenant organizations'),
('22222222-2222-2222-2222-222222222204', 'organization.suspend', 'PLATFORM', 'Suspend or activate tenant organizations'),
('22222222-2222-2222-2222-222222222205', 'organization.admin.create', 'PLATFORM', 'Invite/create organization administrators'),
('22222222-2222-2222-2222-222222222206', 'platform.settings.manage', 'PLATFORM', 'Manage global platform configuration'),
('22222222-2222-2222-2222-222222222207', 'platform.audit.view', 'PLATFORM', 'View system-wide audit logs'),
('22222222-2222-2222-2222-222222222208', 'platform.analytics.view', 'PLATFORM', 'View global SaaS metrics and analytics'),
('22222222-2222-2222-2222-222222222209', 'subscription.manage', 'PLATFORM', 'Manage SaaS subscription plans'),

-- Organization Management & Users
('22222222-2222-2222-2222-222222222210', 'users.view', 'ORGANIZATION', 'View organization users and roster'),
('22222222-2222-2222-2222-222222222211', 'users.invite', 'ORGANIZATION', 'Invite staff members to organization'),
('22222222-2222-2222-2222-222222222212', 'users.assign_role', 'ORGANIZATION', 'Assign or revoke staff roles'),
('22222222-2222-2222-2222-222222222213', 'organization.settings.update', 'ORGANIZATION', 'Update club profile, logo, join code'),
('22222222-2222-2222-2222-222222222214', 'audit.view_org', 'ORGANIZATION', 'View organization audit trail'),

-- Members
('22222222-2222-2222-2222-222222222215', 'members.view', 'ORGANIZATION', 'View member roster and statuses'),
('22222222-2222-2222-2222-222222222216', 'members.manage', 'ORGANIZATION', 'Manage manual memberships and renewals'),
('22222222-2222-2222-2222-222222222217', 'membership.plans.manage', 'ORGANIZATION', 'Create and modify membership plans and benefits'),

-- Events & Tickets
('22222222-2222-2222-2222-222222222218', 'events.create', 'ORGANIZATION', 'Create new events'),
('22222222-2222-2222-2222-222222222219', 'events.update', 'ORGANIZATION', 'Update event details and publish status'),
('22222222-2222-2222-2222-222222222220', 'events.delete', 'ORGANIZATION', 'Cancel or remove events'),
('22222222-2222-2222-2222-222222222221', 'tickets.manage', 'ORGANIZATION', 'Configure ticket types and pricing'),
('22222222-2222-2222-2222-222222222222', 'tickets.scan', 'ORGANIZATION', 'Door check-in and QR ticket scan'),
('22222222-2222-2222-2222-222222222223', 'tickets.refund', 'ORGANIZATION', 'Issue ticket cancellations and refunds'),

-- Products & Inventory
('22222222-2222-2222-2222-222222222224', 'products.manage', 'ORGANIZATION', 'Manage merch catalog and products'),
('22222222-2222-2222-2222-222222222225', 'products.manage_stock', 'ORGANIZATION', 'Restock and adjust product inventory'),

-- Announcements
('22222222-2222-2222-2222-222222222226', 'announcements.create', 'ORGANIZATION', 'Post announcements'),
('22222222-2222-2222-2222-222222222227', 'announcements.update', 'ORGANIZATION', 'Edit announcements'),
('22222222-2222-2222-2222-222222222228', 'announcements.delete', 'ORGANIZATION', 'Delete announcements'),

-- Fundraisers & Tasks
('22222222-2222-2222-2222-222222222229', 'fundraisers.manage', 'ORGANIZATION', 'Manage fundraising campaigns'),
('22222222-2222-2222-2222-222222222230', 'tasks.assign', 'ORGANIZATION', 'Create and assign tasks to volunteers'),
('22222222-2222-2222-2222-222222222231', 'tasks.update_own', 'ORGANIZATION', 'Update status of assigned tasks'),

-- Finance & Claims
('22222222-2222-2222-2222-222222222232', 'expenses.submit', 'ORGANIZATION', 'Submit expense reimbursement claim'),
('22222222-2222-2222-2222-222222222233', 'expenses.approve', 'ORGANIZATION', 'Review and approve/reject claims'),
('22222222-2222-2222-2222-222222222234', 'expenses.reimburse', 'ORGANIZATION', 'Execute reimbursement payouts'),
('22222222-2222-2222-2222-222222222235', 'finance.view', 'ORGANIZATION', 'View detailed finances and transactions'),
('22222222-2222-2222-2222-222222222236', 'finance.report', 'ORGANIZATION', 'Create manual entries and export reports'),
('22222222-2222-2222-2222-222222222237', 'finance.view_summary', 'ORGANIZATION', 'View high-level summary KPIs (read-only)'),
('22222222-2222-2222-2222-222222222238', 'orders.view_all', 'ORGANIZATION', 'View all club customer orders');

-- 13.3 ROLE_PERMISSIONS MAPPING (Exact match from Section 3)
-- PLATFORM_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111101', id FROM permissions WHERE code IN (
    'organization.create', 'organization.view', 'organization.update', 'organization.suspend',
    'organization.admin.create', 'platform.settings.manage', 'platform.audit.view',
    'platform.analytics.view', 'subscription.manage'
);

-- ORG_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111102', id FROM permissions WHERE code IN (
    'users.view', 'users.invite', 'users.assign_role', 'organization.settings.update', 'audit.view_org',
    'members.view', 'members.manage', 'membership.plans.manage',
    'events.create', 'events.update', 'events.delete', 'tickets.manage', 'tickets.scan', 'tickets.refund',
    'products.manage', 'products.manage_stock',
    'announcements.create', 'announcements.update', 'announcements.delete',
    'fundraisers.manage', 'tasks.assign', 'tasks.update_own',
    'expenses.submit', 'expenses.approve', 'expenses.reimburse',
    'finance.view', 'finance.report', 'finance.view_summary', 'orders.view_all'
);

-- TREASURER
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111103', id FROM permissions WHERE code IN (
    'members.view', 'tickets.refund',
    'expenses.submit', 'expenses.approve', 'expenses.reimburse',
    'finance.view', 'finance.report', 'finance.view_summary', 'orders.view_all'
);

-- EVENT_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111104', id FROM permissions WHERE code IN (
    'members.view',
    'events.create', 'events.update', 'events.delete', 'tickets.manage', 'tickets.scan',
    'products.manage', 'products.manage_stock',
    'announcements.create', 'announcements.update', 'announcements.delete',
    'fundraisers.manage', 'tasks.assign', 'tasks.update_own',
    'expenses.submit', 'finance.view_summary', 'orders.view_all'
);

-- GATE_STAFF
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111105', id FROM permissions WHERE code IN (
    'tickets.scan'
);

-- VOLUNTEER
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111106', id FROM permissions WHERE code IN (
    'tasks.update_own', 'expenses.submit'
);

-- 13.4 ORGANIZATIONS & SUBSCRIPTIONS
INSERT INTO subscription_plans (id, name, code, price, features) VALUES
('33333333-3333-3333-3333-333333333301', 'Standard Collegiate', 'COLLEGIATE_STANDARD', 0.00, '{"events": true, "merch": true, "finance": true, "volunteers": true}'::jsonb);

INSERT INTO organizations (id, name, slug, status, join_code, member_number_prefix, currency, timezone, settings) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EDVEXA Student Association', 'edvexa', 'ACTIVE', 'EDVEXA26', 'EDV', 'INR', 'Asia/Kolkata', '{"welcome_message": "Welcome to EDVEXA Student Association!", "primary_color": "#0F766E"}'::jsonb),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABC Sports Club', 'abc-sports', 'ACTIVE', 'ABC26', 'ABC', 'INR', 'Asia/Kolkata', '{"welcome_message": "Welcome to ABC Sports Club!", "primary_color": "#2563EB"}'::jsonb);

INSERT INTO organization_subscriptions (organization_id, plan_id, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333301', 'ACTIVE'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333301', 'ACTIVE');

INSERT INTO academic_terms (id, organization_id, name, start_date, end_date, is_current) VALUES
('44444444-4444-4444-4444-444444444401', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-27', '2026-06-01', '2027-05-31', true),
('44444444-4444-4444-4444-444444444402', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-27', '2026-06-01', '2027-05-31', true);

INSERT INTO org_sequences (organization_id, seq_key, year, next_value) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ORDER', 2026, 18),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CLAIM', 2026, 6),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MEMBER', 2026, 25),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ORDER', 2026, 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CLAIM', 2026, 2),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MEMBER', 2026, 2);

INSERT INTO platform_settings (key, value) VALUES
('site_name', '"EDVEXA"'::jsonb),
('support_email', '"support@edvexa.app"'::jsonb),
('maintenance_mode', 'false'::jsonb),
('allow_public_registration', 'true'::jsonb);

-- Budget categories for EDVEXA Student Association
INSERT INTO budget_categories (id, organization_id, name, type, description) VALUES
('55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dues', 'INCOME', 'Membership annual and semester dues'),
('55555555-5555-5555-5555-555555555502', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tickets', 'INCOME', 'Revenue from event ticket admissions'),
('55555555-5555-5555-5555-555555555503', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Merch', 'INCOME', 'Revenue from branded merchandise sales'),
('55555555-5555-5555-5555-555555555504', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fundraising', 'INCOME', 'Income raised from bake sales and initiatives'),
('55555555-5555-5555-5555-555555555505', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Venue', 'EXPENSE', 'Auditorium and hall rental reservations'),
('55555555-5555-5555-5555-555555555506', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Supplies', 'EXPENSE', 'Operational equipment, printouts, materials'),
('55555555-5555-5555-5555-555555555507', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marketing', 'EXPENSE', 'Promotional materials, banners, and digital ads');

-- Budget categories for ABC Sports Club
INSERT INTO budget_categories (id, organization_id, name, type, description) VALUES
('55555555-5555-5555-5555-555555555511', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dues', 'INCOME', 'Sports club player dues'),
('55555555-5555-5555-5555-555555555512', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tickets', 'INCOME', 'Match ticket sales'),
('55555555-5555-5555-5555-555555555513', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Merch', 'INCOME', 'Jerseys and equipment sales'),
('55555555-5555-5555-5555-555555555514', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Equipment', 'EXPENSE', 'Balls, bats, nets, gear');

-- Term Budgets for 2026-27 (EDVEXA)
INSERT INTO term_budgets (organization_id, term_id, category_id, allocated_amount) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555501', 50000.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555502', 80000.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555503', 30000.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555504', 25000.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555505', 40000.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555506', 20000.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555507', 15000.00);

-- 13.5 SEEDED USERS (The exact 16 accounts from Section 4, plus 8 ordinary students)
-- Password hashing with crypt('<password>', gen_salt('bf', 12)) inside SQL
INSERT INTO users (id, email, password_hash, full_name, phone, status, email_verified_at, is_seeded, created_via, must_change_password) VALUES
-- 1. Platform Admin 1
('66666666-6666-6666-6666-666666666601', 'platform1@edvexa.app', crypt('Plat@Edvexa#1', gen_salt('bf', 12)), 'Platform Administrator Alpha', '+919876543210', 'ACTIVE', now(), true, 'SEED', false),
-- 2. Platform Admin 2
('66666666-6666-6666-6666-666666666602', 'platform2@edvexa.app', crypt('Plat@Edvexa#2', gen_salt('bf', 12)), 'Platform Administrator Beta', '+919876543211', 'ACTIVE', now(), true, 'SEED', false),

-- 3. Org Admin 1 (EDVEXA)
('66666666-6666-6666-6666-666666666603', 'admin1@edvexa.edu', crypt('OrgAdmin@Edv#1', gen_salt('bf', 12)), 'Elena Rostova', '+919876543212', 'ACTIVE', now(), true, 'SEED', false),
-- 4. Org Admin 2 (ABC Sports)
('66666666-6666-6666-6666-666666666604', 'admin2@abcsports.edu', crypt('OrgAdmin@Abc#2', gen_salt('bf', 12)), 'Carlos Mendez', '+919876543213', 'ACTIVE', now(), true, 'SEED', false),

-- 5. Treasurer 1 (EDVEXA)
('66666666-6666-6666-6666-666666666605', 'treasurer1@edvexa.edu', crypt('Treasure@Edv#1', gen_salt('bf', 12)), 'Tara Mehta', '+919876543214', 'ACTIVE', now(), true, 'SEED', false),
-- 6. Treasurer 2 (EDVEXA)
('66666666-6666-6666-6666-666666666606', 'treasurer2@edvexa.edu', crypt('Treasure@Edv#2', gen_salt('bf', 12)), 'Timothy Roy', '+919876543215', 'ACTIVE', now(), true, 'SEED', false),

-- 7. Event Manager 1 (EDVEXA)
('66666666-6666-6666-6666-666666666607', 'events1@edvexa.edu', crypt('EventMgr@Edv#1', gen_salt('bf', 12)), 'Maya Lin', '+919876543216', 'ACTIVE', now(), true, 'SEED', false),
-- 8. Event Manager 2 (EDVEXA)
('66666666-6666-6666-6666-666666666608', 'events2@edvexa.edu', crypt('EventMgr@Edv#2', gen_salt('bf', 12)), 'Ethan Hawke', '+919876543217', 'ACTIVE', now(), true, 'SEED', false),

-- 9. Gate Staff 1 (EDVEXA)
('66666666-6666-6666-6666-666666666609', 'gate1@edvexa.edu', crypt('GateStaff@Edv#1', gen_salt('bf', 12)), 'Gaurav Sharma', '+919876543218', 'ACTIVE', now(), true, 'SEED', false),
-- 10. Gate Staff 2 (EDVEXA)
('66666666-6666-6666-6666-666666666610', 'gate2@edvexa.edu', crypt('GateStaff@Edv#2', gen_salt('bf', 12)), 'Grace Hopper', '+919876543219', 'ACTIVE', now(), true, 'SEED', false),

-- 11. Volunteer 1 (EDVEXA)
('66666666-6666-6666-6666-666666666611', 'volunteer1@edvexa.edu', crypt('Volunteer@Edv#1', gen_salt('bf', 12)), 'Vikram Patel', '+919876543220', 'ACTIVE', now(), true, 'SEED', false),
-- 12. Volunteer 2 (EDVEXA)
('66666666-6666-6666-6666-666666666612', 'volunteer2@edvexa.edu', crypt('Volunteer@Edv#2', gen_salt('bf', 12)), 'Valerie June', '+919876543221', 'ACTIVE', now(), true, 'SEED', false),

-- 13. Member 1 (EDVEXA - Active Gold Pass expires 2026-12-31)
('66666666-6666-6666-6666-666666666613', 'member1@edvexa.edu', crypt('Member@Edv#1', gen_salt('bf', 12)), 'Mira Nair', '+919876543222', 'ACTIVE', now(), true, 'SEED', false),
-- 14. Member 2 (EDVEXA - Active, expiring within 30 days)
('66666666-6666-6666-6666-666666666614', 'member2@edvexa.edu', crypt('Member@Edv#2', gen_salt('bf', 12)), 'Marcus Aurelius', '+919876543223', 'ACTIVE', now(), true, 'SEED', false),

-- 15. Guest 1 (EDVEXA - non-member student)
('66666666-6666-6666-6666-666666666615', 'guest1@edvexa.edu', crypt('Guest@Edv#1', gen_salt('bf', 12)), 'Gita Gopinath', '+919876543224', 'ACTIVE', now(), true, 'SEED', false),
-- 16. Guest 2 (EDVEXA - non-member student)
('66666666-6666-6666-6666-666666666616', 'guest2@edvexa.edu', crypt('Guest@Edv#2', gen_salt('bf', 12)), 'George Lucas', '+919876543225', 'ACTIVE', now(), true, 'SEED', false),

-- Extra ordinary students for realistic lists and reports
('66666666-6666-6666-6666-666666666621', 'student1@edvexa.edu', crypt('Student@Edv#1', gen_salt('bf', 12)), 'Aarav Shah', '+919876543231', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666622', 'student2@edvexa.edu', crypt('Student@Edv#2', gen_salt('bf', 12)), 'Bhavna Sen', '+919876543232', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666623', 'student3@edvexa.edu', crypt('Student@Edv#3', gen_salt('bf', 12)), 'Chirag Dave', '+919876543233', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666624', 'student4@edvexa.edu', crypt('Student@Edv#4', gen_salt('bf', 12)), 'Divya Joshi', '+919876543234', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666625', 'student5@edvexa.edu', crypt('Student@Edv#5', gen_salt('bf', 12)), 'Eshan Reddy', '+919876543235', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666626', 'student6@edvexa.edu', crypt('Student@Edv#6', gen_salt('bf', 12)), 'Fatima Khan', '+919876543236', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666627', 'student7@edvexa.edu', crypt('Student@Edv#7', gen_salt('bf', 12)), 'Gaurav Kapoor', '+919876543237', 'ACTIVE', now(), true, 'SEED', false),
('66666666-6666-6666-6666-666666666628', 'student8@edvexa.edu', crypt('Student@Edv#8', gen_salt('bf', 12)), 'Harshita Verma', '+919876543238', 'ACTIVE', now(), true, 'SEED', false);

-- Organization users association
INSERT INTO organization_users (organization_id, user_id, status, student_id, joined_via) VALUES
-- EDVEXA Staff & Members
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666603', 'ACTIVE', 'STU-2026-ADM1', 'PLATFORM'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666605', 'ACTIVE', 'STU-2026-TRS1', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666606', 'ACTIVE', 'STU-2026-TRS2', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666607', 'ACTIVE', 'STU-2026-EVT1', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666608', 'ACTIVE', 'STU-2026-EVT2', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666609', 'ACTIVE', 'STU-2026-GTE1', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666610', 'ACTIVE', 'STU-2026-GTE2', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666611', 'ACTIVE', 'STU-2026-VOL1', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666612', 'ACTIVE', 'STU-2026-VOL2', 'INVITE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666613', 'ACTIVE', 'STU-2026-MEM1', 'JOIN_CODE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666614', 'ACTIVE', 'STU-2026-MEM2', 'JOIN_CODE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666615', 'ACTIVE', 'STU-2026-GST1', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666616', 'ACTIVE', 'STU-2026-GST2', 'SELF_SIGNUP'),
-- Extra students
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666621', 'ACTIVE', 'STU-2026-0021', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666622', 'ACTIVE', 'STU-2026-0022', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666623', 'ACTIVE', 'STU-2026-0023', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666624', 'ACTIVE', 'STU-2026-0024', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666625', 'ACTIVE', 'STU-2026-0025', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666626', 'ACTIVE', 'STU-2026-0026', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666627', 'ACTIVE', 'STU-2026-0027', 'SELF_SIGNUP'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666628', 'ACTIVE', 'STU-2026-0028', 'SELF_SIGNUP'),
-- ABC Sports Admin
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666604', 'ACTIVE', 'ABC-2026-ADM2', 'PLATFORM');

-- 13.6 USER_ROLES ASSIGNMENT (Single-role accounts; exactly one role each)
INSERT INTO user_roles (user_id, role_id, organization_id, term_id, valid_from) VALUES
-- Platform Admins (scope PLATFORM, organization_id is NULL)
('66666666-6666-6666-6666-666666666601', '11111111-1111-1111-1111-111111111101', NULL, NULL, now()),
('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111101', NULL, NULL, now()),

-- Org Admins
('66666666-6666-6666-6666-666666666603', '11111111-1111-1111-1111-111111111102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),
('66666666-6666-6666-6666-666666666604', '11111111-1111-1111-1111-111111111102', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444402', now()),

-- Treasurers
('66666666-6666-6666-6666-666666666605', '11111111-1111-1111-1111-111111111103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),
('66666666-6666-6666-6666-666666666606', '11111111-1111-1111-1111-111111111103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),

-- Event Managers
('66666666-6666-6666-6666-666666666607', '11111111-1111-1111-1111-111111111104', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),
('66666666-6666-6666-6666-666666666608', '11111111-1111-1111-1111-111111111104', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),

-- Gate Staff
('66666666-6666-6666-6666-666666666609', '11111111-1111-1111-1111-111111111105', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),
('66666666-6666-6666-6666-666666666610', '11111111-1111-1111-1111-111111111105', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),

-- Volunteers
('66666666-6666-6666-6666-666666666611', '11111111-1111-1111-1111-111111111106', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now()),
('66666666-6666-6666-6666-666666666612', '11111111-1111-1111-1111-111111111106', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', now());
-- (Note: MEMBER and GUEST are NEVER stored in roles/user_roles per R1. They are derived from memberships!)

-- Reset bypass
SELECT set_config('app.allow_platform_admin_seed','off',true);

-- 13.7 MEMBERSHIP PLANS & BENEFITS (EDVEXA Student Association)
INSERT INTO membership_plans (id, organization_id, name, description, price, duration_days, is_active) VALUES
('77777777-7777-7777-7777-777777777701', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Annual Gold Pass', 'Full annual pass with premium 20% ticket and 15% merch discounts.', 999.00, 365, true),
('77777777-7777-7777-7777-777777777702', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Semester Silver Pass', 'Semester-wide pass with 10% discounts on all tickets and merch.', 499.00, 180, true),
('77777777-7777-7777-7777-777777777703', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Basic Student Pass', 'Standard membership with 5% off tickets and full voting rights.', 199.00, 365, true);

INSERT INTO membership_benefits (id, organization_id, plan_id, applies_to, discount_type, discount_value) VALUES
('77777777-7777-7777-7777-777777777711', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777701', 'TICKET', 'PERCENT', 20.00),
('77777777-7777-7777-7777-777777777712', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777701', 'PRODUCT', 'PERCENT', 15.00),
('77777777-7777-7777-7777-777777777713', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777702', 'TICKET', 'PERCENT', 10.00),
('77777777-7777-7777-7777-777777777714', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777702', 'PRODUCT', 'PERCENT', 10.00),
('77777777-7777-7777-7777-777777777715', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777703', 'TICKET', 'PERCENT', 5.00);

-- 13.8 SEEDED MEMBERSHIPS (Derived MEMBER role)
-- member1: ACTIVE + PAID, expires 2026-12-31
INSERT INTO memberships (id, organization_id, user_id, plan_id, member_number, status, payment_status, start_date, end_date, qr_token) VALUES
('88888888-8888-8888-8888-888888888801', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666613', '77777777-7777-7777-7777-777777777701', 'EDV-MEM-2026-00001', 'ACTIVE', 'PAID', '2026-01-01', '2026-12-31', 'qr_member_tok_001_live'),
-- member2: ACTIVE + PAID, expiring within 30 days (expires in 15 days from now)
('88888888-8888-8888-8888-888888888802', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666614', '77777777-7777-7777-7777-777777777702', 'EDV-MEM-2026-00002', 'ACTIVE', 'PAID', '2026-04-20', CURRENT_DATE + INTERVAL '15 days', 'qr_member_tok_002_expiring'),
-- extra members
('88888888-8888-8888-8888-888888888803', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666621', '77777777-7777-7777-7777-777777777701', 'EDV-MEM-2026-00003', 'ACTIVE', 'PAID', '2026-01-01', '2026-12-31', 'qr_member_tok_003_aarav'),
('88888888-8888-8888-8888-888888888804', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666622', '77777777-7777-7777-7777-777777777703', 'EDV-MEM-2026-00004', 'ACTIVE', 'PAID', '2026-02-01', '2027-01-31', 'qr_member_tok_004_bhavna');

-- 13.9 EVENTS & TICKET TYPES
INSERT INTO events (id, organization_id, title, description, location, start_time, end_time, status, visibility, total_capacity, sales_open_at, sales_close_at, budget_amount, term_id) VALUES
-- Event 1: Spring Gala (PUBLISHED)
('99999999-9999-9999-9999-999999999901', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spring Gala 2026', 'The annual gala celebration of student achievement and arts.', 'Main Campus Grand Ballroom', now() + INTERVAL '14 days', now() + INTERVAL '14 days 4 hours', 'PUBLISHED', 'PUBLIC', 120, now() - INTERVAL '7 days', now() + INTERVAL '14 days', 15000.00, '44444444-4444-4444-4444-444444444401'),
-- Event 2: Winter Welcome Mixer (COMPLETED)
('99999999-9999-9999-9999-999999999902', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Winter Welcome Mixer', 'Orientation mixer and musical evening for incoming freshers.', 'Student Union Plaza', now() - INTERVAL '30 days', now() - INTERVAL '30 days - 3 hours', 'COMPLETED', 'PUBLIC', 100, now() - INTERVAL '40 days', now() - INTERVAL '30 days', 5000.00, '44444444-4444-4444-4444-444444444401');

INSERT INTO ticket_types (id, organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order) VALUES
-- Gala tickets (Member ₹300 / Guest ₹500, VIP: Member ₹600 / Guest ₹1000)
('99999999-9999-9999-9999-999999999911', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999901', 'General Admission', 300.00, 500.00, 100, 5, 5),
('99999999-9999-9999-9999-999999999912', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999901', 'VIP Access Pass', 600.00, 1000.00, 20, 2, 2),
-- Winter Mixer tickets
('99999999-9999-9999-9999-999999999913', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999902', 'Entry Pass', 100.00, 150.00, 100, 20, 4);

-- 13.10 MERCH PRODUCTS & VARIANTS
INSERT INTO products (id, organization_id, name, description, base_price, member_price, is_active, image_url) VALUES
('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EDVEXA Varsity Hoodie', 'Heavyweight cotton collegiate hoodie embroidered with EDVEXA crest.', 1200.00, 1000.00, true, '/uploads/hoodie.jpg'),
('aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EDVEXA Classic T-Shirt', '100% breathable organic cotton tee with minimalist teal logo.', 500.00, 400.00, true, '/uploads/tshirt.jpg');

INSERT INTO product_variants (id, organization_id, product_id, sku, size, color, stock_quantity, low_stock_threshold) VALUES
-- Hoodie variants
('bbbbbbbb-1111-1111-1111-bbbbbbbb0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'EDV-HD-TEAL-S', 'S', 'Teal', 25, 5),
('bbbbbbbb-1111-1111-1111-bbbbbbbb0002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'EDV-HD-TEAL-M', 'M', 'Teal', 30, 5),
('bbbbbbbb-1111-1111-1111-bbbbbbbb0003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'EDV-HD-TEAL-L', 'L', 'Teal', 18, 5),
('bbbbbbbb-1111-1111-1111-bbbbbbbb0004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'EDV-HD-TEAL-XL', 'XL', 'Teal', 2, 5), -- Low stock demo!
-- T-shirt variants
('bbbbbbbb-2222-2222-2222-bbbbbbbb0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'EDV-TS-WHITE-S', 'S', 'White', 40, 10),
('bbbbbbbb-2222-2222-2222-bbbbbbbb0002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'EDV-TS-WHITE-M', 'M', 'White', 50, 10),
('bbbbbbbb-2222-2222-2222-bbbbbbbb0003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'EDV-TS-WHITE-L', 'L', 'White', 35, 10),
('bbbbbbbb-2222-2222-2222-bbbbbbbb0004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa', 'EDV-TS-WHITE-XL', 'XL', 'White', 15, 5);

-- 13.11 FUNDRAISER & TASKS
INSERT INTO fundraisers (id, organization_id, name, description, goal_amount, raised_amount, budget_amount, status, lead_user_id) VALUES
('cccccccc-1111-1111-1111-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Annual Campus Bake Sale', 'Fundraising drive for student community initiatives and lab supplies.', 25000.00, 18500.00, 3000.00, 'ACTIVE', '66666666-6666-6666-6666-666666666611');

INSERT INTO tasks (id, organization_id, title, description, status, priority, due_date, fundraiser_id, created_by) VALUES
('dddddddd-1111-1111-1111-dddddddd0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bake cookies and muffins', 'Prepare 100 batches of assorted chocolate and oatmeal pastries.', 'DONE', 'HIGH', CURRENT_DATE - INTERVAL '2 days', 'cccccccc-1111-1111-1111-cccccccccccc', '66666666-6666-6666-6666-666666666611'),
('dddddddd-1111-1111-1111-dddddddd0002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Set up canopy and tables', 'Assemble foldable tables and banner stands at Quad lawn.', 'IN_PROGRESS', 'MEDIUM', CURRENT_DATE + INTERVAL '1 day', 'cccccccc-1111-1111-1111-cccccccccccc', '66666666-6666-6666-6666-666666666611'),
('dddddddd-1111-1111-1111-dddddddd0003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Procure packaging boxes and napkins', 'Collect biodegradable containers from logistics office.', 'DONE', 'LOW', CURRENT_DATE - INTERVAL '1 day', 'cccccccc-1111-1111-1111-cccccccccccc', '66666666-6666-6666-6666-666666666611'),
('dddddddd-1111-1111-1111-dddddddd0004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Print promotional flyers and posters', 'Collect prints from campus press for bulletin boards.', 'BLOCKED', 'HIGH', CURRENT_DATE + INTERVAL '2 days', 'cccccccc-1111-1111-1111-cccccccccccc', '66666666-6666-6666-6666-666666666612'),
('dddddddd-1111-1111-1111-dddddddd0005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Manage cash register & UPI scanner', 'Oversee checkout station during afternoon lunch rush.', 'TODO', 'URGENT', CURRENT_DATE + INTERVAL '3 days', 'cccccccc-1111-1111-1111-cccccccccccc', '66666666-6666-6666-6666-666666666612');

INSERT INTO task_assignments (organization_id, task_id, user_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-1111-1111-1111-dddddddd0001', '66666666-6666-6666-6666-666666666611'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-1111-1111-1111-dddddddd0002', '66666666-6666-6666-6666-666666666611'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-1111-1111-1111-dddddddd0003', '66666666-6666-6666-6666-666666666611'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-1111-1111-1111-dddddddd0004', '66666666-6666-6666-6666-666666666612'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-1111-1111-1111-dddddddd0005', '66666666-6666-6666-6666-666666666612');

-- 13.12 ANNOUNCEMENTS
INSERT INTO announcements (id, organization_id, author_id, title, content, category, audience, is_pinned, publish_at, published_at) VALUES
('eeeeeeee-1111-1111-1111-eeeeeeee0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666603', 'Welcome to the 2026 Academic Year!', 'We are thrilled to welcome all new and returning students. Check out our upcoming calendar and get your membership cards early to enjoy gala discounts.', 'GENERAL', 'ALL', true, now() - INTERVAL '10 days', now() - INTERVAL '10 days'),
('eeeeeeee-1111-1111-1111-eeeeeeee0002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666607', 'Volunteer Coordination Meeting for Bake Sale', 'All registered volunteers please attend the briefing this Thursday at 5 PM in Room 302.', 'MEETING', 'VOLUNTEERS', false, now() - INTERVAL '3 days', now() - INTERVAL '3 days'),
('eeeeeeee-1111-1111-1111-eeeeeeee0003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666607', 'Spring Gala Ticket Sales Now Open!', 'Early bird sales have officially launched. Gold Pass members save 20% on all admission passes.', 'GENERAL', 'ALL', false, now() - INTERVAL '1 day', now() - INTERVAL '1 day');

-- 13.13 EXPENSE CLAIMS & RECEIPTS
INSERT INTO expense_claims (id, organization_id, user_id, category_id, claim_number, title, description, amount, status, reviewed_by, reviewed_at, term_id) VALUES
-- 1: SUBMITTED
('ffffffff-1111-1111-1111-ffffffff0001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666611', '55555555-5555-5555-5555-555555555506', 'EDV-CLM-2026-00001', 'Bake Sale Flyer Printing', 'Commercial digital printout of 200 promotional A3 posters.', 850.00, 'SUBMITTED', NULL, NULL, '44444444-4444-4444-4444-444444444401'),
-- 2: APPROVED
('ffffffff-1111-1111-1111-ffffffff0002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666607', '55555555-5555-5555-5555-555555555505', 'EDV-CLM-2026-00002', 'Gala Sound Equipment Rental Deposit', 'Stage audio amplification setup deposit for Grand Ballroom.', 3500.00, 'APPROVED', '66666666-6666-6666-6666-666666666605', now() - INTERVAL '2 days', '44444444-4444-4444-4444-444444444401'),
-- 3: REIMBURSED (already paid out)
('ffffffff-1111-1111-1111-ffffffff0003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666612', '55555555-5555-5555-5555-555555555506', 'EDV-CLM-2026-00003', 'Welcome Mixer Refreshments', 'Bulk supply of juice cartons, cups, and dry snacks.', 2200.00, 'REIMBURSED', '66666666-6666-6666-6666-666666666605', now() - INTERVAL '15 days', '44444444-4444-4444-4444-444444444401');

UPDATE expense_claims SET reimbursed_at = now() - INTERVAL '14 days' WHERE id = 'ffffffff-1111-1111-1111-ffffffff0003';

INSERT INTO expense_receipts (organization_id, claim_id, file_name, file_url, file_size, mime_type) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ffffffff-1111-1111-1111-ffffffff0001', 'print_invoice_01.pdf', '/uploads/receipts/print_invoice_01.pdf', 104250, 'application/pdf'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ffffffff-1111-1111-1111-ffffffff0002', 'sound_rental_receipt.png', '/uploads/receipts/sound_rental_receipt.png', 452100, 'image/png'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ffffffff-1111-1111-1111-ffffffff0003', 'mart_refreshment_bill.pdf', '/uploads/receipts/mart_refreshment_bill.pdf', 89200, 'application/pdf');

-- 13.14 ORDERS, PAYMENTS, TICKETS, CHECK-INS & LEDGER ENTRIES
-- 13.14.1 Membership Order for member1 (Dues)
INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at) VALUES
('00000000-1111-1111-1111-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666613', 'EDV-ORD-2026-00001', 'MEMBERSHIP', 'PAID', 999.00, 0.00, 999.00, now() + INTERVAL '1 hour', now() - INTERVAL '60 days');

INSERT INTO order_items (organization_id, order_id, plan_id, quantity, unit_price, was_member_price, fulfillment_status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000001', '77777777-7777-7777-7777-777777777701', 1, 999.00, false, 'NONE');

INSERT INTO payments (id, organization_id, order_id, amount, method, status, provider_ref, idempotency_key, created_at) VALUES
('00000000-2222-2222-2222-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000001', 999.00, 'ONLINE', 'SUCCESS', 'PAY_UPI_MEM_001', 'idem_mem_001', now() - INTERVAL '60 days');

INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, created_at) VALUES
('00000000-3333-3333-3333-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555501', 'IN', 999.00, 'PAYMENT', '00000000-2222-2222-2222-000000000001', 'Annual Gold Pass Membership Dues - Mira Nair', 'EDV-ORD-2026-00001', now() - INTERVAL '60 days');

-- 13.14.2 Ticket Order for Gala (Tickets)
INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at) VALUES
('00000000-1111-1111-1111-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666613', 'EDV-ORD-2026-00002', 'TICKET', 'PAID', 300.00, 200.00, 300.00, now() + INTERVAL '1 hour', now() - INTERVAL '5 days');

INSERT INTO order_items (organization_id, order_id, ticket_type_id, quantity, unit_price, was_member_price, fulfillment_status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000002', '99999999-9999-9999-9999-999999999911', 1, 300.00, true, 'NONE');

INSERT INTO payments (id, organization_id, order_id, amount, method, status, provider_ref, idempotency_key, created_at) VALUES
('00000000-2222-2222-2222-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000002', 300.00, 'UPI', 'SUCCESS', 'PAY_UPI_TKT_002', 'idem_tkt_002', now() - INTERVAL '5 days');

INSERT INTO tickets (id, organization_id, order_id, event_id, ticket_type_id, user_id, ticket_code, price_paid, was_member_price, status) VALUES
('00000000-4444-4444-4444-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000002', '99999999-9999-9999-9999-999999999901', '99999999-9999-9999-9999-999999999911', '66666666-6666-6666-6666-666666666613', 'EDV-TKT-2026-GAL-001', 300.00, true, 'VALID');

INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, created_at) VALUES
('00000000-3333-3333-3333-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555502', 'IN', 300.00, 'PAYMENT', '00000000-2222-2222-2222-000000000002', 'Spring Gala 2026 Ticket - Mira Nair (Member Price)', 'EDV-ORD-2026-00002', now() - INTERVAL '5 days');

-- 13.14.3 Merch Order (Hoodie)
INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at) VALUES
('00000000-1111-1111-1111-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666613', 'EDV-ORD-2026-00003', 'MERCH', 'PAID', 1000.00, 200.00, 1000.00, now() + INTERVAL '1 hour', now() - INTERVAL '3 days');

INSERT INTO order_items (organization_id, order_id, variant_id, quantity, unit_price, was_member_price, fulfillment_status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000003', 'bbbbbbbb-1111-1111-1111-bbbbbbbb0002', 1, 1000.00, true, 'READY');

INSERT INTO payments (id, organization_id, order_id, amount, method, status, provider_ref, idempotency_key, created_at) VALUES
('00000000-2222-2222-2222-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000003', 1000.00, 'CARD', 'SUCCESS', 'PAY_CARD_MERCH_003', 'idem_mrc_003', now() - INTERVAL '3 days');

INSERT INTO stock_movements (organization_id, variant_id, movement_type, quantity_change, reference_order_id, notes) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-1111-1111-1111-bbbbbbbb0002', 'SALE', -1, '00000000-1111-1111-1111-000000000003', 'Customer purchase order EDV-ORD-2026-00003');

INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, created_at) VALUES
('00000000-3333-3333-3333-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555503', 'IN', 1000.00, 'PAYMENT', '00000000-2222-2222-2222-000000000003', 'EDVEXA Varsity Hoodie (M) - Mira Nair', 'EDV-ORD-2026-00003', now() - INTERVAL '3 days');

-- 13.14.4 Fundraiser Direct Income
INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, description, reference_number, created_at) VALUES
('00000000-3333-3333-3333-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555504', 'IN', 18500.00, 'MANUAL', 'Bake Sale Quad Day Counter Collections', 'EDV-FND-2026-001', now() - INTERVAL '2 days');

-- 13.14.5 Past Event Ticket & Check-in Demo
INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at) VALUES
('00000000-1111-1111-1111-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666613', 'EDV-ORD-2026-00004', 'TICKET', 'PAID', 100.00, 50.00, 100.00, now() + INTERVAL '1 hour', now() - INTERVAL '35 days');

INSERT INTO order_items (organization_id, order_id, ticket_type_id, quantity, unit_price, was_member_price, fulfillment_status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000004', '99999999-9999-9999-9999-999999999913', 1, 100.00, true, 'NONE');

INSERT INTO payments (id, organization_id, order_id, amount, method, status, provider_ref, idempotency_key, created_at) VALUES
('00000000-2222-2222-2222-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000004', 100.00, 'ONLINE', 'SUCCESS', 'PAY_MIXER_004', 'idem_mix_004', now() - INTERVAL '35 days');

INSERT INTO tickets (id, organization_id, order_id, event_id, ticket_type_id, user_id, ticket_code, price_paid, was_member_price, status) VALUES
('00000000-4444-4444-4444-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-1111-1111-1111-000000000004', '99999999-9999-9999-9999-999999999902', '99999999-9999-9999-9999-999999999913', '66666666-6666-6666-6666-666666666613', 'EDV-TKT-2026-WNT-001', 100.00, true, 'USED');

INSERT INTO check_ins (organization_id, ticket_id, scanned_by, membership_verified, method, checked_in_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-4444-4444-4444-000000000002', '66666666-6666-6666-6666-666666666609', true, 'QR', now() - INTERVAL '30 days 2 hours');

INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, created_at) VALUES
('00000000-3333-3333-3333-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555502', 'IN', 100.00, 'PAYMENT', '00000000-2222-2222-2222-000000000004', 'Winter Mixer Admission - Mira Nair', 'EDV-ORD-2026-00004', now() - INTERVAL '35 days');

-- 13.14.6 Reimbursement Expense Outflow (Ledger OUT)
INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, expense_claim_id, description, reference_number, created_at) VALUES
('00000000-3333-3333-3333-000000000006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555506', 'OUT', 2200.00, 'EXPENSE_CLAIM', 'ffffffff-1111-1111-1111-ffffffff0003', 'Reimbursement Payout: Welcome Mixer Refreshments - Valerie June', 'EDV-CLM-2026-00003', now() - INTERVAL '14 days');

-- 13.15 ABC SPORTS CLUB DEMO DATA (For Tenant Isolation Testing)
INSERT INTO events (id, organization_id, title, description, location, start_time, end_time, status, visibility, total_capacity, sales_open_at, sales_close_at, budget_amount, term_id) VALUES
('bbbbbbbb-9999-9999-9999-999999999901', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Inter-College Football Derby', 'Annual football championship match.', 'East Stadium', now() + INTERVAL '20 days', now() + INTERVAL '20 days 3 hours', 'PUBLISHED', 'PUBLIC', 200, now(), now() + INTERVAL '20 days', 8000.00, '44444444-4444-4444-4444-444444444402');

INSERT INTO ticket_types (id, organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order) VALUES
('bbbbbbbb-9999-9999-9999-999999999911', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-9999-9999-9999-999999999901', 'Stadium Bleachers', 150.00, 250.00, 200, 0, 4);

-- 13.16 INITIAL AUDIT LOGS
INSERT INTO audit_logs (organization_id, actor_email, action, target_type, target_id, details) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'platform1@edvexa.app', 'ORGANIZATION_INITIALIZE', 'ORGANIZATION', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"name": "EDVEXA Student Association", "status": "ACTIVE"}'::jsonb),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'platform1@edvexa.app', 'ORGANIZATION_INITIALIZE', 'ORGANIZATION', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"name": "ABC Sports Club", "status": "ACTIVE"}'::jsonb),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin1@edvexa.edu', 'EVENT_PUBLISH', 'EVENT', '99999999-9999-9999-9999-999999999901', '{"title": "Spring Gala 2026"}'::jsonb),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'treasurer1@edvexa.edu', 'CLAIM_REIMBURSE', 'EXPENSE_CLAIM', 'ffffffff-1111-1111-1111-ffffffff0003', '{"amount": 2200.00, "claim_number": "EDV-CLM-2026-00003"}'::jsonb);

-- End of complete SQL script

-- Reconcile inventory with real seeded purchases rather than invented sold counters.
UPDATE ticket_types tt SET quantity_sold=COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.ticket_type_id=tt.id AND o.status IN ('PAID','FULFILLED','PENDING')),0);
UPDATE ticket_types SET quantity_total=2, max_per_order=2 WHERE id='99999999-9999-9999-9999-999999999911';
UPDATE product_variants SET stock_quantity=0 WHERE sku='EDV-TS-WHITE-XL';
UPDATE orders SET subtotal=total+discount_total;
UPDATE users SET status='PENDING_EMAIL_VERIFICATION',email_verified_at=NULL WHERE email='student7@edvexa.edu';
UPDATE organization_users SET status='SUSPENDED' WHERE user_id=(SELECT id FROM users WHERE email='student8@edvexa.edu');
INSERT INTO memberships(organization_id,user_id,plan_id,member_number,status,payment_status,start_date,end_date,qr_token)
VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','66666666-6666-6666-6666-666666666623','77777777-7777-7777-7777-777777777702','EDV-MEM-2026-00005','EXPIRED','PAID',CURRENT_DATE-200,CURRENT_DATE-20,encode(gen_random_bytes(32),'hex'));
INSERT INTO tasks(organization_id,title,description,status,priority,fundraiser_id,created_by)
VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Clean up after bake sale','Return equipment and sort recycling','TODO','MEDIUM','cccccccc-1111-1111-1111-cccccccccccc','66666666-6666-6666-6666-666666666603');
INSERT INTO task_assignments(organization_id,task_id,user_id)
SELECT organization_id,id,'66666666-6666-6666-6666-666666666612' FROM tasks WHERE title='Clean up after bake sale';
INSERT INTO announcements(organization_id,author_id,title,content,category,audience,publish_at)
VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','66666666-6666-6666-6666-666666666603','Membership renewal deadline','Renew your plan before the semester closes.','DEADLINE','ALL',now()+interval '2 days');
INSERT INTO notifications(organization_id,user_id,title,message,type,channel,status)
SELECT ou.organization_id,ou.user_id,a.title,a.content,'ANNOUNCEMENT','IN_APP','SENT'
FROM organization_users ou JOIN announcements a ON a.organization_id=ou.organization_id
WHERE a.published_at<=now() AND a.audience='ALL' AND ou.status='ACTIVE';
UPDATE memberships SET order_id='00000000-1111-1111-1111-000000000001' WHERE id='88888888-8888-8888-8888-888888888801';
INSERT INTO platform_settings(key,value) VALUES ('schema_version','"2026.10.recovery.1"'),('seed_version','"2026.10.recovery.1"');

$seed_data$; END; $seed_guard$;
