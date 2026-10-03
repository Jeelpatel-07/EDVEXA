-- ========================================================
-- EDVEXA COMPLETE DATABASE SCHEMA & INITIALIZATION SCRIPT
-- Runnable top-to-bottom in psql / pgAdmin Query Tool
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE org_status_enum AS ENUM ('PENDING_SETUP', 'ACTIVE', 'SUSPENDED');
CREATE TYPE user_status_enum AS ENUM ('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE user_created_via_enum AS ENUM ('SELF_SIGNUP', 'SEED', 'INVITE', 'PLATFORM');
CREATE TYPE org_user_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'LEFT');
CREATE TYPE org_user_joined_via_enum AS ENUM ('SELF_SIGNUP', 'JOIN_CODE', 'INVITE', 'PLATFORM');
CREATE TYPE role_scope_enum AS ENUM ('PLATFORM', 'ORGANIZATION');
CREATE TYPE role_created_by_enum AS ENUM ('NONE', 'PLATFORM_ADMIN', 'ORG_ADMIN');
CREATE TYPE auth_token_purpose_enum AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');
CREATE TYPE membership_status_enum AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE membership_payment_status_enum AS ENUM ('UNPAID', 'PAID', 'REFUNDED');
CREATE TYPE benefit_applies_to_enum AS ENUM ('TICKET', 'PRODUCT');
CREATE TYPE discount_type_enum AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE event_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED', 'COMPLETED');
CREATE TYPE event_visibility_enum AS ENUM ('PUBLIC', 'MEMBERS_ONLY');
CREATE TYPE ticket_status_enum AS ENUM ('VALID', 'USED', 'CANCELLED', 'REFUNDED');
CREATE TYPE check_in_method_enum AS ENUM ('QR', 'MANUAL');
CREATE TYPE stock_movement_type_enum AS ENUM ('RESTOCK', 'SALE', 'RETURN', 'ADJUSTMENT');
CREATE TYPE order_type_enum AS ENUM ('TICKET', 'MERCH', 'MEMBERSHIP');
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED');
CREATE TYPE item_fulfillment_status_enum AS ENUM ('NONE', 'READY', 'PICKED_UP');
CREATE TYPE payment_method_enum AS ENUM ('ONLINE', 'CASH', 'UPI', 'CARD');
CREATE TYPE payment_status_enum AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE announcement_category_enum AS ENUM ('MEETING', 'DEADLINE', 'CHANGE', 'GENERAL');
CREATE TYPE announcement_audience_enum AS ENUM ('ALL', 'MEMBERS_ONLY', 'VOLUNTEERS', 'EVENT_ATTENDEES');
CREATE TYPE notification_type_enum AS ENUM ('ANNOUNCEMENT', 'RENEWAL_REMINDER', 'ORDER', 'TASK', 'EXPENSE');
CREATE TYPE notification_channel_enum AS ENUM ('EMAIL', 'IN_APP');
CREATE TYPE notification_status_enum AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');
CREATE TYPE fundraiser_status_enum AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE task_status_enum AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');
CREATE TYPE task_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE budget_category_type_enum AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE expense_claim_status_enum AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');
CREATE TYPE ledger_direction_enum AS ENUM ('IN', 'OUT');
CREATE TYPE ledger_source_type_enum AS ENUM ('PAYMENT', 'EXPENSE_CLAIM', 'MANUAL', 'REFUND');

-- 3. CORE PLATFORM & IDENTITY TABLES

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status org_status_enum NOT NULL DEFAULT 'ACTIVE',
    join_code VARCHAR(50) UNIQUE NOT NULL,
    member_number_prefix VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_organizations_id UNIQUE (id)
);

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_subscription UNIQUE (id, organization_id)
);

CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_sequences (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    seq_key VARCHAR(50) NOT NULL, -- 'ORDER', 'CLAIM', 'MEMBER'
    year INT NOT NULL,
    next_value INT NOT NULL DEFAULT 1,
    PRIMARY KEY (organization_id, seq_key, year)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    email_verified_at TIMESTAMPTZ,
    failed_login_count INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_seeded BOOLEAN NOT NULL DEFAULT false,
    created_via user_created_via_enum NOT NULL DEFAULT 'SELF_SIGNUP',
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status org_user_status_enum NOT NULL DEFAULT 'ACTIVE',
    student_id VARCHAR(100),
    joined_via org_user_joined_via_enum NOT NULL DEFAULT 'SELF_SIGNUP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_users_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_org_users_user_org UNIQUE (organization_id, user_id)
);
CREATE UNIQUE INDEX uq_org_users_student_id ON organization_users (organization_id, student_id) WHERE student_id IS NOT NULL;

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    scope role_scope_enum NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT true,
    is_assignable_via_api BOOLEAN NOT NULL DEFAULT true,
    created_by_role role_created_by_enum NOT NULL DEFAULT 'NONE',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    scope role_scope_enum NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_academic_terms_id_org UNIQUE (id, organization_id)
);
CREATE UNIQUE INDEX uq_org_current_term ON academic_terms (organization_id) WHERE is_current = true;

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_user_roles_platform ON user_roles (user_id, role_id) WHERE organization_id IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX uq_user_roles_org ON user_roles (user_id, role_id, organization_id, term_id) WHERE organization_id IS NOT NULL AND revoked_at IS NULL;

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email citext NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    token_hash VARCHAR(255) NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_by_role VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose auth_token_purpose_enum NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    family_id UUID NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_agent VARCHAR(500),
    ip VARCHAR(100),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext NOT NULL,
    ip VARCHAR(100),
    user_agent VARCHAR(500),
    successful BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MEMBERSHIP TABLES

CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    duration_days INT NOT NULL DEFAULT 365,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membership_plans_id_org UNIQUE (id, organization_id)
);

CREATE TABLE membership_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,
    applies_to benefit_applies_to_enum NOT NULL,
    discount_type discount_type_enum NOT NULL,
    discount_value NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membership_benefits_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_membership_benefits_plan FOREIGN KEY (plan_id, organization_id) REFERENCES membership_plans(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,
    member_number VARCHAR(50) NOT NULL,
    status membership_status_enum NOT NULL DEFAULT 'PENDING',
    payment_status membership_payment_status_enum NOT NULL DEFAULT 'UNPAID',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    order_id UUID,
    renewed_from_id UUID REFERENCES memberships(id),
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_memberships_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_memberships_org_member_num UNIQUE (organization_id, member_number),
    CONSTRAINT fk_memberships_plan FOREIGN KEY (plan_id, organization_id) REFERENCES membership_plans(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT chk_membership_dates CHECK (end_date > start_date)
);
CREATE UNIQUE INDEX uq_active_membership ON memberships (organization_id, user_id) WHERE status = 'ACTIVE';

-- 5. FUNDRAISERS & TASKS TABLES

CREATE TABLE fundraisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    raised_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    budget_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status fundraiser_status_enum NOT NULL DEFAULT 'PLANNING',
    lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_fundraisers_id_org UNIQUE (id, organization_id)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status event_status_enum NOT NULL DEFAULT 'DRAFT',
    visibility event_visibility_enum NOT NULL DEFAULT 'PUBLIC',
    total_capacity INT NOT NULL DEFAULT 100,
    sales_open_at TIMESTAMPTZ,
    sales_close_at TIMESTAMPTZ,
    budget_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fundraiser_id UUID REFERENCES fundraisers(id) ON DELETE SET NULL,
    term_id UUID,
    banner_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_events_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_events_term FOREIGN KEY (term_id, organization_id) REFERENCES academic_terms(id, organization_id) ON DELETE SET NULL
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status_enum NOT NULL DEFAULT 'TODO',
    priority task_priority_enum NOT NULL DEFAULT 'MEDIUM',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    fundraiser_id UUID,
    event_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tasks_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_tasks_fundraiser FOREIGN KEY (fundraiser_id, organization_id) REFERENCES fundraisers(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_event FOREIGN KEY (event_id, organization_id) REFERENCES events(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_assignments_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_task_assignments_task_user UNIQUE (task_id, user_id),
    CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id, organization_id) REFERENCES tasks(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_comments_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id, organization_id) REFERENCES tasks(id, organization_id) ON DELETE CASCADE
);

-- 6. TICKETS, PRODUCTS, ORDERS, PAYMENTS

CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    member_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    non_member_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    quantity_total INT NOT NULL DEFAULT 100,
    quantity_sold INT NOT NULL DEFAULT 0,
    max_per_order INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_types_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_ticket_types_event FOREIGN KEY (event_id, organization_id) REFERENCES events(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT chk_ticket_sold_total CHECK (quantity_sold <= quantity_total),
    CONSTRAINT chk_ticket_member_price CHECK (member_price <= non_member_price)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    member_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_id_org UNIQUE (id, organization_id)
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL DEFAULT 'Standard',
    color VARCHAR(50) NOT NULL DEFAULT 'Standard',
    stock_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_variants_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_product_variants_org_sku UNIQUE (organization_id, sku),
    CONSTRAINT uq_product_variants_size_color UNIQUE (product_id, size, color),
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT chk_product_stock_nonnegative CHECK (stock_quantity >= 0)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    order_type order_type_enum NOT NULL,
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_orders_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_orders_org_order_num UNIQUE (organization_id, order_number)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    ticket_type_id UUID,
    variant_id UUID,
    plan_id UUID,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    was_member_price BOOLEAN NOT NULL DEFAULT false,
    fulfillment_status item_fulfillment_status_enum NOT NULL DEFAULT 'NONE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_items_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id, organization_id) REFERENCES orders(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_ticket_type FOREIGN KEY (ticket_type_id, organization_id) REFERENCES ticket_types(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id, organization_id) REFERENCES product_variants(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_plan FOREIGN KEY (plan_id, organization_id) REFERENCES membership_plans(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_item_target CHECK (
        (CASE WHEN ticket_type_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN variant_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN plan_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    event_id UUID NOT NULL,
    ticket_type_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_code VARCHAR(64) UNIQUE NOT NULL,
    price_paid NUMERIC(12,2) NOT NULL,
    was_member_price BOOLEAN NOT NULL DEFAULT false,
    status ticket_status_enum NOT NULL DEFAULT 'VALID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tickets_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_tickets_order FOREIGN KEY (order_id, organization_id) REFERENCES orders(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_event FOREIGN KEY (event_id, organization_id) REFERENCES events(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_ticket_type FOREIGN KEY (ticket_type_id, organization_id) REFERENCES ticket_types(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticket_id UUID UNIQUE NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membership_verified BOOLEAN NOT NULL DEFAULT false,
    method check_in_method_enum NOT NULL DEFAULT 'QR',
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_check_ins_id_org UNIQUE (id, organization_id)
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL,
    movement_type stock_movement_type_enum NOT NULL,
    quantity_change INT NOT NULL,
    reference_order_id UUID,
    notes TEXT,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stock_movements_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_stock_movements_variant FOREIGN KEY (variant_id, organization_id) REFERENCES product_variants(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    method payment_method_enum NOT NULL DEFAULT 'ONLINE',
    status payment_status_enum NOT NULL DEFAULT 'INITIATED',
    provider_ref VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payments_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id, organization_id) REFERENCES orders(id, organization_id) ON DELETE CASCADE
);

-- 7. COMMUNICATION & NOTIFICATIONS

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category announcement_category_enum NOT NULL DEFAULT 'GENERAL',
    audience announcement_audience_enum NOT NULL DEFAULT 'ALL',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    publish_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    event_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_announcements_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_announcements_event FOREIGN KEY (event_id, organization_id) REFERENCES events(id, organization_id) ON DELETE SET NULL
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type_enum NOT NULL,
    channel notification_channel_enum NOT NULL DEFAULT 'IN_APP',
    status notification_status_enum NOT NULL DEFAULT 'SENT',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_notifications_id_org UNIQUE (id, organization_id)
);

CREATE TABLE mailing_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email citext NOT NULL,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_mailing_subscribers_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_mailing_subscribers_org_email UNIQUE (organization_id, email)
);

-- 8. FINANCE & LEDGER TABLES

CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type budget_category_type_enum NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_budget_categories_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_budget_categories_org_name UNIQUE (organization_id, name)
);

CREATE TABLE term_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    term_id UUID NOT NULL,
    category_id UUID NOT NULL,
    allocated_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_term_budgets_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_term_budgets_term_cat UNIQUE (term_id, category_id),
    CONSTRAINT fk_term_budgets_term FOREIGN KEY (term_id, organization_id) REFERENCES academic_terms(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_term_budgets_cat FOREIGN KEY (category_id, organization_id) REFERENCES budget_categories(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL,
    claim_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    status expense_claim_status_enum NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT,
    reimbursed_at TIMESTAMPTZ,
    term_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_expense_claims_id_org UNIQUE (id, organization_id),
    CONSTRAINT uq_expense_claims_org_num UNIQUE (organization_id, claim_number),
    CONSTRAINT fk_expense_claims_category FOREIGN KEY (category_id, organization_id) REFERENCES budget_categories(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_expense_claims_term FOREIGN KEY (term_id, organization_id) REFERENCES academic_terms(id, organization_id) ON DELETE SET NULL
);

CREATE TABLE expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_expense_receipts_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_expense_receipts_claim FOREIGN KEY (claim_id, organization_id) REFERENCES expense_claims(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    term_id UUID,
    category_id UUID,
    direction ledger_direction_enum NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    source_type ledger_source_type_enum NOT NULL,
    payment_id UUID UNIQUE,
    expense_claim_id UUID UNIQUE,
    description TEXT NOT NULL,
    reference_number VARCHAR(100),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ledger_entries_id_org UNIQUE (id, organization_id),
    CONSTRAINT fk_ledger_entries_term FOREIGN KEY (term_id, organization_id) REFERENCES academic_terms(id, organization_id) ON DELETE SET NULL,
    CONSTRAINT fk_ledger_entries_category FOREIGN KEY (category_id, organization_id) REFERENCES budget_categories(id, organization_id) ON DELETE SET NULL,
    CONSTRAINT fk_ledger_entries_payment FOREIGN KEY (payment_id, organization_id) REFERENCES payments(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_entries_claim FOREIGN KEY (expense_claim_id, organization_id) REFERENCES expense_claims(id, organization_id) ON DELETE RESTRICT
);

-- 9. AUDIT LOGS

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email citext,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revoke UPDATE and DELETE from audit_logs for DB users
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON ledger_entries FROM PUBLIC;

-- 10. INDEXES (With organization_id as the FIRST column on composite tenant indexes)
CREATE INDEX idx_org_users_org_user ON organization_users (organization_id, user_id);
CREATE INDEX idx_user_roles_org_user ON user_roles (organization_id, user_id);
CREATE INDEX idx_user_roles_org_term ON user_roles (organization_id, term_id);
CREATE INDEX idx_memberships_org_user ON memberships (organization_id, user_id);
CREATE INDEX idx_events_org_status ON events (organization_id, status);
CREATE INDEX idx_ticket_types_org_event ON ticket_types (organization_id, event_id);
CREATE INDEX idx_tickets_org_event ON tickets (organization_id, event_id);
CREATE INDEX idx_tickets_org_user ON tickets (organization_id, user_id);
CREATE INDEX idx_product_variants_org_prod ON product_variants (organization_id, product_id);
CREATE INDEX idx_orders_org_user ON orders (organization_id, user_id);
CREATE INDEX idx_order_items_org_order ON order_items (organization_id, order_id);
CREATE INDEX idx_payments_org_order ON payments (organization_id, order_id);
CREATE INDEX idx_announcements_org_pub ON announcements (organization_id, publish_at);
CREATE INDEX idx_notifications_org_user ON notifications (organization_id, user_id, status);
CREATE INDEX idx_tasks_org_status ON tasks (organization_id, status);
CREATE INDEX idx_expense_claims_org_user ON expense_claims (organization_id, user_id);
CREATE INDEX idx_expense_claims_org_status ON expense_claims (organization_id, status);
CREATE INDEX idx_ledger_entries_org_term ON ledger_entries (organization_id, term_id);
CREATE INDEX idx_audit_logs_org_created ON audit_logs (organization_id, created_at);

-- 11. FUNCTIONS & TRIGGERS

-- 11.1 updated_at trigger
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();', t, t);
    END LOOP;
END;
$$;

-- 11.2 Guard PLATFORM_ADMIN creation / assignment
CREATE OR REPLACE FUNCTION fn_guard_platform_admin()
RETURNS TRIGGER AS $$
DECLARE
    v_platform_admin_role_id UUID;
BEGIN
    SELECT id INTO v_platform_admin_role_id FROM roles WHERE code = 'PLATFORM_ADMIN';
    IF NEW.role_id = v_platform_admin_role_id THEN
        IF current_setting('app.allow_platform_admin_seed', true) IS DISTINCT FROM 'on' THEN
            RAISE EXCEPTION 'PLATFORM_ADMIN role cannot be assigned or created. It is seed-only.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_platform_admin ON user_roles;
CREATE TRIGGER trg_guard_platform_admin
BEFORE INSERT OR UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION fn_guard_platform_admin();

-- Also guard invitations from ever inviting PLATFORM_ADMIN
CREATE OR REPLACE FUNCTION fn_guard_invitation_platform_admin()
RETURNS TRIGGER AS $$
DECLARE
    v_platform_admin_role_id UUID;
BEGIN
    SELECT id INTO v_platform_admin_role_id FROM roles WHERE code = 'PLATFORM_ADMIN';
    IF NEW.role_id = v_platform_admin_role_id THEN
        RAISE EXCEPTION 'Cannot invite a PLATFORM_ADMIN.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_invitation_platform_admin ON invitations;
CREATE TRIGGER trg_guard_invitation_platform_admin
BEFORE INSERT OR UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION fn_guard_invitation_platform_admin();

-- 11.3 Role Scope Check
CREATE OR REPLACE FUNCTION fn_check_role_scope()
RETURNS TRIGGER AS $$
DECLARE
    v_scope role_scope_enum;
BEGIN
    SELECT scope INTO v_scope FROM roles WHERE id = NEW.role_id;
    IF v_scope = 'PLATFORM' AND NEW.organization_id IS NOT NULL THEN
        RAISE EXCEPTION 'Platform-scoped roles must have NULL organization_id.';
    ELSIF v_scope = 'ORGANIZATION' AND NEW.organization_id IS NULL THEN
        RAISE EXCEPTION 'Organization-scoped roles must specify an organization_id.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_role_scope ON user_roles;
CREATE TRIGGER trg_check_role_scope
BEFORE INSERT OR UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION fn_check_role_scope();

-- 11.4 Last ORG_ADMIN Protection Trigger
CREATE OR REPLACE FUNCTION fn_protect_last_org_admin()
RETURNS TRIGGER AS $$
DECLARE
    v_org_admin_role_id UUID;
    v_target_org_id UUID;
    v_remaining_admins INT;
BEGIN
    SELECT id INTO v_org_admin_role_id FROM roles WHERE code = 'ORG_ADMIN';

    IF TG_OP = 'UPDATE' THEN
        -- If an ORG_ADMIN role is being revoked
        IF OLD.role_id = v_org_admin_role_id AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
            v_target_org_id := OLD.organization_id;
            SELECT COUNT(*) INTO v_remaining_admins
            FROM user_roles ur
            JOIN organization_users ou ON ou.user_id = ur.user_id AND ou.organization_id = ur.organization_id
            WHERE ur.organization_id = v_target_org_id
              AND ur.role_id = v_org_admin_role_id
              AND ur.revoked_at IS NULL
              AND ur.id <> OLD.id
              AND ou.status = 'ACTIVE';

            IF v_remaining_admins < 1 THEN
                RAISE EXCEPTION 'Cannot revoke the last active ORG_ADMIN for organization %.', v_target_org_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.role_id = v_org_admin_role_id AND OLD.revoked_at IS NULL THEN
            v_target_org_id := OLD.organization_id;
            SELECT COUNT(*) INTO v_remaining_admins
            FROM user_roles ur
            JOIN organization_users ou ON ou.user_id = ur.user_id AND ou.organization_id = ur.organization_id
            WHERE ur.organization_id = v_target_org_id
              AND ur.role_id = v_org_admin_role_id
              AND ur.revoked_at IS NULL
              AND ur.id <> OLD.id
              AND ou.status = 'ACTIVE';

            IF v_remaining_admins < 1 THEN
                RAISE EXCEPTION 'Cannot delete the last active ORG_ADMIN for organization %.', v_target_org_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_last_org_admin ON user_roles;
CREATE TRIGGER trg_protect_last_org_admin
BEFORE UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION fn_protect_last_org_admin();

-- 11.5 Ledger Immutability Trigger
CREATE OR REPLACE FUNCTION fn_immutable_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable. Create a reversal entry instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_ledger ON ledger_entries;
CREATE TRIGGER trg_immutable_ledger
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION fn_immutable_ledger();

-- 11.6 Audit Log Immutability Trigger
CREATE OR REPLACE FUNCTION fn_immutable_audit()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable append-only.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_audit ON audit_logs;
CREATE TRIGGER trg_immutable_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_immutable_audit();

-- 11.7 Sequence Generator Function
CREATE OR REPLACE FUNCTION fn_next_sequence(p_org_id UUID, p_seq_key VARCHAR, p_year INT)
RETURNS INT AS $$
DECLARE
    v_val INT;
BEGIN
    INSERT INTO org_sequences (organization_id, seq_key, year, next_value)
    VALUES (p_org_id, p_seq_key, p_year, 2)
    ON CONFLICT (organization_id, seq_key, year)
    DO UPDATE SET next_value = org_sequences.next_value + 1
    RETURNING org_sequences.next_value - 1 INTO v_val;

    RETURN v_val;
END;
$$ LANGUAGE plpgsql;

-- 11.8 Derived Member Rule Function
CREATE OR REPLACE FUNCTION fn_is_member(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM memberships m
        WHERE m.user_id = p_user_id
          AND m.organization_id = p_org_id
          AND m.status = 'ACTIVE'
          AND m.payment_status = 'PAID'
          AND m.end_date >= CURRENT_DATE
    ) INTO v_is_active;

    RETURN coalesce(v_is_active, false);
END;
$$ LANGUAGE plpgsql;

-- 11.9 User Permissions Function
CREATE OR REPLACE FUNCTION fn_user_permissions(p_user_id UUID, p_org_id UUID)
RETURNS TABLE (permission_code VARCHAR) AS $$
BEGIN
    IF p_org_id IS NULL THEN
        -- Platform-level permissions
        RETURN QUERY
        SELECT DISTINCT p.code::VARCHAR
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = p_user_id
          AND ur.organization_id IS NULL
          AND ur.revoked_at IS NULL
          AND (ur.valid_to IS NULL OR ur.valid_to >= now());
    ELSE
        -- Organization-level permissions for active roles valid in the org's current term
        RETURN QUERY
        SELECT DISTINCT p.code::VARCHAR
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        LEFT JOIN academic_terms at ON at.id = ur.term_id
        WHERE ur.user_id = p_user_id
          AND ur.organization_id = p_org_id
          AND ur.revoked_at IS NULL
          AND (ur.valid_to IS NULL OR ur.valid_to >= now())
          AND (ur.term_id IS NULL OR at.is_current = true);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. VIEWS

-- 12.1 v_user_org_status
CREATE OR REPLACE VIEW v_user_org_status AS
SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    u.status AS user_status,
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    o.status AS organization_status,
    ou.status AS org_user_status,
    ou.student_id,
    fn_is_member(u.id, o.id) AS is_member,
    m.member_number,
    m.status AS membership_status,
    m.end_date AS membership_end_date,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.code), NULL) AS assigned_roles
FROM users u
LEFT JOIN organization_users ou ON ou.user_id = u.id
LEFT JOIN organizations o ON o.id = ou.organization_id
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = o.id AND ur.revoked_at IS NULL
LEFT JOIN roles r ON r.id = ur.role_id
LEFT JOIN memberships m ON m.user_id = u.id AND m.organization_id = o.id AND m.status = 'ACTIVE'
GROUP BY u.id, u.email, u.full_name, u.status, o.id, o.name, o.slug, o.status, ou.status, ou.student_id, m.member_number, m.status, m.end_date;

-- 12.2 v_platform_stats
CREATE OR REPLACE VIEW v_platform_stats AS
SELECT
    (SELECT COUNT(*) FROM organizations) AS total_organizations,
    (SELECT COUNT(*) FROM organizations WHERE status = 'ACTIVE') AS active_organizations,
    (SELECT COUNT(*) FROM organizations WHERE status = 'SUSPENDED') AS suspended_organizations,
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS active_users,
    (SELECT COUNT(*) FROM events) AS total_events,
    (SELECT coalesce(SUM(quantity_sold), 0) FROM ticket_types) AS total_tickets_sold,
    (SELECT coalesce(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS') AS total_platform_volume;

-- 12.3 v_event_report
CREATE OR REPLACE VIEW v_event_report AS
SELECT
    e.id AS event_id,
    e.organization_id,
    e.title,
    e.status,
    e.total_capacity,
    coalesce(SUM(tt.quantity_sold), 0)::INT AS tickets_sold,
    (SELECT COUNT(*) FROM check_ins ci JOIN tickets t ON t.id = ci.ticket_id WHERE t.event_id = e.id)::INT AS tickets_checked_in,
    CASE 
        WHEN coalesce(SUM(tt.quantity_sold), 0) > 0 THEN 
            ROUND(
                ((coalesce(SUM(tt.quantity_sold), 0) - (SELECT COUNT(*) FROM check_ins ci JOIN tickets t ON t.id = ci.ticket_id WHERE t.event_id = e.id))::NUMERIC 
                / coalesce(SUM(tt.quantity_sold), 1)) * 100, 
                2
            )
        ELSE 0 
    END AS no_show_percentage,
    coalesce(
        (SELECT SUM(price_paid) FROM tickets t WHERE t.event_id = e.id AND t.status IN ('VALID', 'USED')), 
        0
    ) AS gross_revenue,
    coalesce(
        (SELECT SUM(ec.amount) FROM expense_claims ec JOIN tasks tk ON tk.event_id = e.id WHERE ec.status = 'REIMBURSED'),
        0
    ) AS expenses,
    coalesce(
        (SELECT SUM(price_paid) FROM tickets t WHERE t.event_id = e.id AND t.status IN ('VALID', 'USED')), 
        0
    ) - coalesce(
        (SELECT SUM(ec.amount) FROM expense_claims ec JOIN tasks tk ON tk.event_id = e.id WHERE ec.status = 'REIMBURSED'),
        0
    ) AS net_revenue
FROM events e
LEFT JOIN ticket_types tt ON tt.event_id = e.id
GROUP BY e.id, e.organization_id, e.title, e.status, e.total_capacity;

-- 12.4 v_member_status
CREATE OR REPLACE VIEW v_member_status AS
SELECT
    m.id AS membership_id,
    m.organization_id,
    m.user_id,
    u.full_name,
    u.email,
    ou.student_id,
    m.member_number,
    m.status AS raw_status,
    m.payment_status,
    m.start_date,
    m.end_date,
    m.qr_token,
    CASE
        WHEN m.status = 'ACTIVE' AND m.end_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN m.status = 'ACTIVE' AND m.end_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'EXPIRING_SOON'
        WHEN m.status = 'ACTIVE' THEN 'ACTIVE'
        ELSE m.status::VARCHAR
    END AS derived_status,
    (m.end_date - CURRENT_DATE) AS days_until_expiry,
    mp.name AS plan_name
FROM memberships m
JOIN users u ON u.id = m.user_id
LEFT JOIN organization_users ou ON ou.user_id = m.user_id AND ou.organization_id = m.organization_id
JOIN membership_plans mp ON mp.id = m.plan_id;

-- 12.5 v_finance_summary
CREATE OR REPLACE VIEW v_finance_summary AS
SELECT
    le.organization_id,
    le.term_id,
    bc.id AS category_id,
    bc.name AS category_name,
    bc.type AS category_type,
    coalesce(SUM(CASE WHEN le.direction = 'IN' THEN le.amount ELSE 0 END), 0) AS total_in,
    coalesce(SUM(CASE WHEN le.direction = 'OUT' THEN le.amount ELSE 0 END), 0) AS total_out,
    coalesce(SUM(CASE WHEN le.direction = 'IN' THEN le.amount ELSE -le.amount END), 0) AS net_balance
FROM budget_categories bc
LEFT JOIN ledger_entries le ON le.category_id = bc.id AND le.organization_id = bc.organization_id
GROUP BY le.organization_id, le.term_id, bc.id, bc.name, bc.type;

-- 12.6 v_stock_levels
CREATE OR REPLACE VIEW v_stock_levels AS
SELECT
    p.organization_id,
    p.id AS product_id,
    p.name AS product_name,
    pv.id AS variant_id,
    pv.sku,
    pv.size,
    pv.color,
    pv.stock_quantity,
    pv.low_stock_threshold,
    (pv.stock_quantity <= pv.low_stock_threshold) AS is_low_stock
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.organization_id = p.organization_id;

-- 12.7 v_fundraiser_progress
CREATE OR REPLACE VIEW v_fundraiser_progress AS
SELECT
    f.id AS fundraiser_id,
    f.organization_id,
    f.name,
    f.goal_amount,
    f.raised_amount,
    CASE 
        WHEN f.goal_amount > 0 THEN ROUND((f.raised_amount / f.goal_amount) * 100, 2)
        ELSE 0 
    END AS raised_pct,
    COUNT(t.id)::INT AS total_tasks,
    COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::INT AS completed_tasks,
    CASE 
        WHEN COUNT(t.id) > 0 THEN ROUND((COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::NUMERIC / COUNT(t.id)) * 100, 2)
        ELSE 0 
    END AS task_done_pct
FROM fundraisers f
LEFT JOIN tasks t ON t.fundraiser_id = f.id AND t.organization_id = f.organization_id
GROUP BY f.id, f.organization_id, f.name, f.goal_amount, f.raised_amount;

-- ========================================================
-- 13. SEED DATA
-- ========================================================

-- Enable platform admin seed trigger bypass ONLY for this block
SET app.allow_platform_admin_seed = 'on';

-- 13.1 ROLES (Exactly 6 stored roles per R1)
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
RESET app.allow_platform_admin_seed;

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
