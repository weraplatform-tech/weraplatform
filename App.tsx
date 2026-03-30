import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/ui'
import React, { Suspense } from 'react'

// Lazy imports
const LandingPage     = React.lazy(() => import('@/pages/LandingPage'))
const LoginPage       = React.lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage    = React.lazy(() => import('@/pages/auth/RegisterPage'))
const DashboardLayout = React.lazy(() => import('@/components/layout/DashboardLayout'))
const DashboardHome   = React.lazy(() => import('@/pages/dashboard/DashboardHome'))
const MarketplacePage = React.lazy(() => import('@/pages/marketplace/MarketplacePage'))
const ProviderProfile = React.lazy(() => import('@/pages/marketplace/ProviderProfile'))
const BookingsPage    = React.lazy(() => import('@/pages/bookings/BookingsPage'))
const BookingDetail   = React.lazy(() => import('@/pages/bookings/BookingDetail'))
const PaymentsPage    = React.lazy(() => import('@/pages/payments/PaymentsPage'))
const ProfilePage     = React.lazy(() => import('@/pages/profile/ProfilePage'))
const AdminDashboard  = React.lazy(() => import('@/pages/admin/AdminDashboard'))

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  if (role && user?.role !== role && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/auth/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          {/* Protected — Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="marketplace"         element={<MarketplacePage />} />
            <Route path="marketplace/:id"     element={<ProviderProfile />} />
            <Route path="bookings"            element={<BookingsPage />} />
            <Route path="bookings/:id"        element={<BookingDetail />} />
            <Route path="payments"            element={<PaymentsPage />} />
            <Route path="profile"             element={<ProfilePage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
