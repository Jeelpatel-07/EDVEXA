import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

// Layouts
import PublicNavbar from "./components/layout/PublicNavbar";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PermissionGuard from "./components/common/PermissionGuard";

// Public Pages
import Home from "./pages/public/Home";
import PublicEvents from "./pages/public/PublicEvents";
import EventDetail from "./pages/public/EventDetail";
import PublicAnnouncements from "./pages/public/PublicAnnouncements";
import AnnouncementDetail from "./pages/public/AnnouncementDetail";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";

// Personal Workspace Pages
import Dashboard from "./pages/personal/Dashboard";
import Membership from "./pages/personal/Membership";
import MembershipPlans from "./pages/personal/MembershipPlans";
import MembershipRenew from "./pages/personal/MembershipRenew";
import MyTickets from "./pages/personal/MyTickets";
import TicketDetail from "./pages/personal/TicketDetail";
import Shop from "./pages/personal/Shop";
import ProductDetail from "./pages/personal/ProductDetail";
import Cart from "./pages/personal/Cart";
import Checkout from "./pages/personal/Checkout";
import Orders from "./pages/personal/Orders";
import OrderDetail from "./pages/personal/OrderDetail";
import VolunteerTasks from "./pages/personal/VolunteerTasks";
import TaskDetail from "./pages/personal/TaskDetail";
import MyClaims from "./pages/personal/MyClaims";
import NewClaim from "./pages/personal/NewClaim";
import ClaimDetail from "./pages/personal/ClaimDetail";
import Notifications from "./pages/personal/Notifications";
import Profile from "./pages/personal/Profile";

// Staff Workspace Pages
import StaffOverview from "./pages/staff/StaffOverview";
import ManageMembers from "./pages/staff/ManageMembers";
import ManageMembershipPlans from "./pages/staff/ManageMembershipPlans";
import ManageEvents from "./pages/staff/ManageEvents";
import NewEvent from "./pages/staff/NewEvent";
import GateCheckIn from "./pages/staff/GateCheckIn";
import ManageProducts from "./pages/staff/ManageProducts";
import NewProduct from "./pages/staff/NewProduct";
import Inventory from "./pages/staff/Inventory";
import ManageOrders from "./pages/staff/ManageOrders";
import ManageAnnouncements from "./pages/staff/ManageAnnouncements";
import NewAnnouncement from "./pages/staff/NewAnnouncement";
import ManageFundraisers from "./pages/staff/ManageFundraisers";
import NewFundraiser from "./pages/staff/NewFundraiser";
import ManageClaims from "./pages/staff/ManageClaims";
import ReviewClaim from "./pages/staff/ReviewClaim";
import FinanceDashboard from "./pages/staff/FinanceDashboard";
import LedgerEntries from "./pages/staff/LedgerEntries";
import NewLedgerEntry from "./pages/staff/NewLedgerEntry";
import FinanceReports from "./pages/staff/FinanceReports";
import ManageUsers from "./pages/staff/ManageUsers";

// Public Layout Wrapper with PublicNavbar and Footer
function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-card py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">
              E
            </span>
            <span className="font-semibold text-foreground">
              EDVEXA — Unified Student Organization Platform
            </span>
          </div>
          <div>
            Collegiate Student Council • All Rights Reserved © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            {/* PUBLIC WEBSITE ROUTES */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<PublicEvents />} />
              <Route path="/events/:eventId" element={<EventDetail />} />
              <Route path="/announcements" element={<PublicAnnouncements />} />
              <Route path="/announcements/:announcementId" element={<AnnouncementDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* AUTHENTICATED WORKSPACES */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Redirect /app to /app/dashboard */}
              <Route index element={<Navigate to="/app/dashboard" replace />} />

              {/* PERSONAL WORKSPACE */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="membership" element={<Membership />} />
              <Route path="membership/plans" element={<MembershipPlans />} />
              <Route path="membership/renew" element={<MembershipRenew />} />
              <Route path="tickets" element={<MyTickets />} />
              <Route path="tickets/:ticketId" element={<TicketDetail />} />
              <Route path="shop" element={<Shop />} />
              <Route path="shop/products/:productId" element={<ProductDetail />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout/:orderId" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderId" element={<OrderDetail />} />
              <Route path="announcements" element={<PublicAnnouncements />} />
              <Route path="announcements/:announcementId" element={<AnnouncementDetail />} />
              <Route path="tasks" element={<VolunteerTasks />} />
              <Route path="tasks/:taskId" element={<TaskDetail />} />
              <Route path="claims" element={<MyClaims />} />
              <Route path="claims/new" element={<NewClaim />} />
              <Route path="claims/:claimId" element={<ClaimDetail />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />

              {/* STAFF WORKSPACE (Guarded by Permissions) */}
              <Route path="manage" element={<StaffOverview />} />
              
              <Route
                path="manage/members"
                element={
                  <PermissionGuard permission="canManageMembers">
                    <ManageMembers />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/membership-plans"
                element={
                  <PermissionGuard permission="canManageMembers">
                    <ManageMembershipPlans />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/events"
                element={
                  <PermissionGuard permission="canManageEvents">
                    <ManageEvents />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/events/new"
                element={
                  <PermissionGuard permission="canManageEvents">
                    <NewEvent />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/check-in"
                element={
                  <PermissionGuard permission="canCheckIn">
                    <GateCheckIn />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/products"
                element={
                  <PermissionGuard permission="canManageShop">
                    <ManageProducts />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/products/new"
                element={
                  <PermissionGuard permission="canManageShop">
                    <NewProduct />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/inventory"
                element={
                  <PermissionGuard permission="canManageShop">
                    <Inventory />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/orders"
                element={
                  <PermissionGuard permission="canManageShop">
                    <ManageOrders />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/orders/:orderId"
                element={<OrderDetail />}
              />
              <Route
                path="manage/announcements"
                element={
                  <PermissionGuard permission="canManageEvents">
                    <ManageAnnouncements />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/announcements/new"
                element={
                  <PermissionGuard permission="canManageEvents">
                    <NewAnnouncement />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/fundraisers"
                element={
                  <PermissionGuard permission="canViewFinance">
                    <ManageFundraisers />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/fundraisers/new"
                element={
                  <PermissionGuard permission="canViewFinance">
                    <NewFundraiser />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/claims"
                element={
                  <PermissionGuard permission="canReviewClaims">
                    <ManageClaims />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/claims/:claimId"
                element={
                  <PermissionGuard permission="canReviewClaims">
                    <ReviewClaim />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/finance"
                element={
                  <PermissionGuard permission="canViewFinance">
                    <FinanceDashboard />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/finance/entries"
                element={
                  <PermissionGuard permission="canViewFinance">
                    <LedgerEntries />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/finance/entries/new"
                element={
                  <PermissionGuard permission="canViewFinance">
                    <NewLedgerEntry />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/reports"
                element={
                  <PermissionGuard permission="canViewFinance">
                    <FinanceReports />
                  </PermissionGuard>
                }
              />
              <Route
                path="manage/users"
                element={
                  <PermissionGuard permission="canManageUsers">
                    <ManageUsers />
                  </PermissionGuard>
                }
              />
            </Route>

            {/* Fallback for undefined routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
