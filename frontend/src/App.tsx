import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/AdminLayout';
import { TellerLayout } from './components/TellerLayout';
import { CustomerLayout } from './components/CustomerLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransferPage } from './pages/TransferPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { AccountsPage } from './pages/AccountsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SellerPage } from './pages/SellerPage';
import { WebhooksSePayPage } from './pages/WebhooksSePayPage';

interface RoleRouteProps {
  allowedRole: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  children: React.ReactNode;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRole, children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500 font-medium">
        Đang tải NovaBank Core...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Strict role isolation: if the actor tries to access a different actor's portal, redirect to their own
  if (user.role !== allowedRole) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'STAFF') {
      return <Navigate to="/teller" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 1. ADMIN PORTAL: Exclusively for ROLE_ADMIN */}
          <Route
            path="/admin/*"
            element={
              <RoleRoute allowedRole="ADMIN">
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* 2. TELLER / SELLER DIRECT DESK: Exclusively for ROLE_STAFF */}
          <Route
            path="/teller/*"
            element={
              <RoleRoute allowedRole="STAFF">
                <TellerLayout />
              </RoleRoute>
            }
          >
            <Route index element={<SellerPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/teller" replace />} />
          </Route>

          {/* 3. CUSTOMER PORTAL: Exclusively for ROLE_CUSTOMER */}
          <Route
            path="/*"
            element={
              <RoleRoute allowedRole="CUSTOMER">
                <CustomerLayout />
              </RoleRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="transfer" element={<TransferPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="sepay" element={<WebhooksSePayPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
