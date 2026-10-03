-- DESTRUCTIVE: all EDVEXA records will be removed. Make pg_dump backup first.
-- Explicit opt-in required in the SAME session: SET app.confirm_reset='DELETE_EDVEXA_DATA';
BEGIN;
DO $$ BEGIN IF current_setting('app.confirm_reset',true) IS DISTINCT FROM 'DELETE_EDVEXA_DATA' THEN
RAISE EXCEPTION 'Reset refused: back up first and explicitly set app.confirm_reset'; END IF; END $$;
-- ========================================================
-- EDVEXA DATABASE RESET SCRIPT
-- Drops all tables, views, functions, triggers, and types
-- ========================================================

DROP VIEW IF EXISTS v_fundraiser_progress CASCADE;
DROP VIEW IF EXISTS v_stock_levels CASCADE;
DROP VIEW IF EXISTS v_finance_summary CASCADE;
DROP VIEW IF EXISTS v_member_status CASCADE;
DROP VIEW IF EXISTS v_event_report CASCADE;
DROP VIEW IF EXISTS v_platform_stats CASCADE;
DROP VIEW IF EXISTS v_user_org_status CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS expense_receipts CASCADE;
DROP TABLE IF EXISTS expense_claims CASCADE;
DROP TABLE IF EXISTS term_budgets CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS mailing_subscribers CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS fundraisers CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS membership_benefits CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS academic_terms CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS org_sequences CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS organization_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

DROP FUNCTION IF EXISTS fn_set_updated_at CASCADE;
DROP FUNCTION IF EXISTS fn_guard_platform_admin CASCADE;
DROP FUNCTION IF EXISTS fn_check_role_scope CASCADE;
DROP FUNCTION IF EXISTS fn_protect_last_org_admin CASCADE;
DROP FUNCTION IF EXISTS fn_immutable_ledger CASCADE;
DROP FUNCTION IF EXISTS fn_immutable_audit CASCADE;
DROP FUNCTION IF EXISTS fn_next_sequence CASCADE;
DROP FUNCTION IF EXISTS fn_is_member CASCADE;
DROP FUNCTION IF EXISTS fn_user_permissions CASCADE;

DROP TYPE IF EXISTS org_status_enum CASCADE;
DROP TYPE IF EXISTS user_status_enum CASCADE;
DROP TYPE IF EXISTS user_created_via_enum CASCADE;
DROP TYPE IF EXISTS org_user_status_enum CASCADE;
DROP TYPE IF EXISTS org_user_joined_via_enum CASCADE;
DROP TYPE IF EXISTS role_scope_enum CASCADE;
DROP TYPE IF EXISTS role_created_by_enum CASCADE;
DROP TYPE IF EXISTS auth_token_purpose_enum CASCADE;
DROP TYPE IF EXISTS membership_status_enum CASCADE;
DROP TYPE IF EXISTS membership_payment_status_enum CASCADE;
DROP TYPE IF EXISTS benefit_applies_to_enum CASCADE;
DROP TYPE IF EXISTS discount_type_enum CASCADE;
DROP TYPE IF EXISTS event_status_enum CASCADE;
DROP TYPE IF EXISTS event_visibility_enum CASCADE;
DROP TYPE IF EXISTS ticket_status_enum CASCADE;
DROP TYPE IF EXISTS check_in_method_enum CASCADE;
DROP TYPE IF EXISTS stock_movement_type_enum CASCADE;
DROP TYPE IF EXISTS order_type_enum CASCADE;
DROP TYPE IF EXISTS order_status_enum CASCADE;
DROP TYPE IF EXISTS item_fulfillment_status_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS announcement_category_enum CASCADE;
DROP TYPE IF EXISTS announcement_audience_enum CASCADE;
DROP TYPE IF EXISTS notification_type_enum CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;
DROP TYPE IF EXISTS notification_status_enum CASCADE;
DROP TYPE IF EXISTS fundraiser_status_enum CASCADE;
DROP TYPE IF EXISTS task_status_enum CASCADE;
DROP TYPE IF EXISTS task_priority_enum CASCADE;
DROP TYPE IF EXISTS budget_category_type_enum CASCADE;
DROP TYPE IF EXISTS expense_claim_status_enum CASCADE;
DROP TYPE IF EXISTS ledger_direction_enum CASCADE;
DROP TYPE IF EXISTS ledger_source_type_enum CASCADE;

DROP FUNCTION IF EXISTS fn_keep_org_admin() CASCADE;
COMMIT;
