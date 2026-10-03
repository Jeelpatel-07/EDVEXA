/**
 * EDVEXA Authoritative Permission & Role Architecture
 *
 * Strict implementation of Section 4: Absolute Permission Matrix
 * Explicit Roles: PLATFORM_ADMIN, ORG_ADMIN, TREASURER, EVENT_MANAGER, GATE_STAFF, VOLUNTEER
 * Derived States: MEMBER (derived from active paid membership), GUEST (registered non-member)
 */

export const PERMISSIONS = {
  // Platform Level
  ORGANIZATIONS_MANAGE: "organizations.manage",

  // Organization Users & Roles
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",

  // Events & Ticketing
  EVENTS_CREATE: "events.create",
  EVENTS_UPDATE: "events.update",
  EVENTS_DELETE: "events.delete",
  EVENTS_MANAGE: "events.manage",
  TICKETS_MANAGE: "tickets.manage",
  TICKETS_SCAN: "tickets.scan",
  TICKETS_CHECKIN: "tickets.checkin",

  // Announcements
  ANNOUNCEMENTS_CREATE: "announcements.create",
  ANNOUNCEMENTS_UPDATE: "announcements.update",
  ANNOUNCEMENTS_PUBLISH: "announcements.publish",
  ANNOUNCEMENTS_MANAGE: "announcements.manage",

  // Products & Inventory
  PRODUCTS_MANAGE: "products.manage",
  INVENTORY_MANAGE: "inventory.manage",

  // Fundraisers & Tasks
  FUNDRAISERS_MANAGE: "fundraisers.manage",
  TASKS_CREATE: "tasks.create",
  TASKS_ASSIGN: "tasks.assign",
  TASKS_UPDATE_OWN: "tasks.update_own",

  // Expense Claims
  EXPENSES_SUBMIT: "expenses.submit",
  EXPENSES_APPROVE: "expenses.approve",
  EXPENSES_REIMBURSE: "expenses.reimburse",

  // Financial Governance
  FINANCE_VIEW: "finance.view",
  FINANCE_READ_ONLY: "finance.read_only",
  FINANCE_MANAGE: "finance.manage",

  // Commerce & Own Data
  ORDERS_PURCHASE: "orders.purchase",
  ORDERS_VIEW_OWN: "orders.view_own",
  MEMBERSHIP_VIEW_OWN: "membership.view_own",
  MEMBERSHIP_PURCHASE: "membership.purchase",
};

export const ROLES = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  TREASURER: "TREASURER",
  EVENT_MANAGER: "EVENT_MANAGER",
  GATE_STAFF: "GATE_STAFF",
  VOLUNTEER: "VOLUNTEER",
};

/**
 * Explicit staff roles assignable at the organization level by ORG_ADMIN.
 * Notice: PLATFORM_ADMIN is platform-level, and MEMBER is NEVER assignable.
 */
export const ASSIGNABLE_STAFF_ROLES = [
  ROLES.TREASURER,
  ROLES.EVENT_MANAGER,
  ROLES.GATE_STAFF,
  ROLES.VOLUNTEER,
];

/**
 * Role descriptions for assignment UX and tooltips
 */
export const ROLE_METADATA = {
  [ROLES.PLATFORM_ADMIN]: {
    name: "Platform Administrator",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Operates EDVEXA platform organizations, tenants, and platform audit logs.",
  },
  [ROLES.ORG_ADMIN]: {
    name: "Organization Administrator",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Highest organization authority. Manages users, roles, operations, and governance.",
  },
  [ROLES.TREASURER]: {
    name: "Treasurer",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Authoritative financial officer. Approves expense claims, manages ledger, and issues payouts.",
  },
  [ROLES.EVENT_MANAGER]: {
    name: "Event Manager",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Manages events, ticketing, merchandise, and announcements. Read-only treasury view.",
  },
  [ROLES.GATE_STAFF]: {
    name: "Gate Staff",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    description: "Operational check-in crew. Scans tickets and validates QR entry codes at the door.",
  },
  [ROLES.VOLUNTEER]: {
    name: "Volunteer",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Fulfills designated operational tasks and submits reimbursable expense claims.",
  },
};

/**
 * Absolute Permission Mapping for each role.
 * Strictly adheres to Section 4 & Section 5 (No automatic higher-role inheritance).
 */
export const ROLE_PERMISSIONS_MAP = {
  [ROLES.PLATFORM_ADMIN]: [
    PERMISSIONS.ORGANIZATIONS_MANAGE,
    PERMISSIONS.FINANCE_VIEW, // Section 4 matrix: PLATFORM_ADMIN: YES
  ],

  [ROLES.ORG_ADMIN]: [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_UPDATE,
    PERMISSIONS.EVENTS_DELETE,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.TICKETS_SCAN,
    PERMISSIONS.TICKETS_CHECKIN,
    PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.ANNOUNCEMENTS_UPDATE,
    PERMISSIONS.ANNOUNCEMENTS_PUBLISH,
    PERMISSIONS.ANNOUNCEMENTS_MANAGE,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.FUNDRAISERS_MANAGE,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_ASSIGN,
    PERMISSIONS.TASKS_UPDATE_OWN,
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.EXPENSES_REIMBURSE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.ORDERS_PURCHASE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_PURCHASE,
  ],

  [ROLES.TREASURER]: [
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.EXPENSES_REIMBURSE,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.ORDERS_PURCHASE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_PURCHASE,
  ],

  [ROLES.EVENT_MANAGER]: [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_UPDATE,
    PERMISSIONS.EVENTS_DELETE,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.TICKETS_SCAN,
    PERMISSIONS.TICKETS_CHECKIN,
    PERMISSIONS.ANNOUNCEMENTS_CREATE,
    PERMISSIONS.ANNOUNCEMENTS_UPDATE,
    PERMISSIONS.ANNOUNCEMENTS_PUBLISH,
    PERMISSIONS.ANNOUNCEMENTS_MANAGE,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.FUNDRAISERS_MANAGE,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_ASSIGN,
    PERMISSIONS.TASKS_UPDATE_OWN,
    PERMISSIONS.EXPENSES_SUBMIT,
    // Section 4 & 25: READ-ONLY finance
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_READ_ONLY,
    PERMISSIONS.ORDERS_PURCHASE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_PURCHASE,
  ],

  [ROLES.GATE_STAFF]: [
    PERMISSIONS.TICKETS_SCAN,
    PERMISSIONS.TICKETS_CHECKIN,
    PERMISSIONS.ORDERS_PURCHASE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_PURCHASE,
  ],

  [ROLES.VOLUNTEER]: [
    PERMISSIONS.TASKS_UPDATE_OWN,
    PERMISSIONS.EXPENSES_SUBMIT,
    PERMISSIONS.ORDERS_PURCHASE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_VIEW_OWN,
    PERMISSIONS.MEMBERSHIP_PURCHASE,
  ],
};

/**
 * Base permissions common to all registered users (GUEST / non-staff).
 */
export const BASE_REGISTERED_PERMISSIONS = [
  PERMISSIONS.ORDERS_PURCHASE,
  PERMISSIONS.ORDERS_VIEW_OWN,
  PERMISSIONS.MEMBERSHIP_VIEW_OWN,
  PERMISSIONS.MEMBERSHIP_PURCHASE,
];

/**
 * Computes the union of permissions from an array of roles.
 * Supports multiple explicit roles (Section 18).
 *
 * @param {string[]} roles
 * @returns {string[]} Set of unique permissions
 */
export function computePermissionsForRoles(roles = []) {
  const permSet = new Set(BASE_REGISTERED_PERMISSIONS);

  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS_MAP[role] || [];
    for (const perm of rolePerms) {
      permSet.add(perm);
    }
  }

  return Array.from(permSet);
}

/**
 * Checks if a membership object qualifies for derived MEMBER status.
 * Section 8:
 * - status === 'ACTIVE'
 * - payment_status === 'PAID' (or valid active status)
 * - expiryDate in the future
 *
 * @param {object|null} membership
 * @returns {boolean}
 */
export function isMembershipActive(membership) {
  if (!membership) return false;
  if (membership.status !== "ACTIVE") return false;
  if (membership.paymentStatus && membership.paymentStatus !== "PAID") return false;
  if (membership.expiryDate) {
    const expiry = new Date(membership.expiryDate);
    if (expiry < new Date()) return false;
  }
  return true;
}
