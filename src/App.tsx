import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { PageLoading } from '@/components/ui/loading'

// Pages
import { ApplyPage } from '@/pages/ApplyPage'
import { ApplyDonePage } from '@/pages/ApplyDonePage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { ResidentsPage } from '@/pages/ResidentsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { CashPage } from '@/pages/CashPage'
import { StorePOSPage } from '@/pages/StorePOSPage'
import { StoreProductsPage } from '@/pages/StoreProductsPage'
import { StorePurchasesPage } from '@/pages/StorePurchasesPage'
import { StoreStockPage } from '@/pages/StoreStockPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageLoading />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

function StoreRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['admin', 'store_staff']}>{children}</ProtectedRoute>
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoading />

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/apply/done" element={<ApplyDonePage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      {/* Staff routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/residents" element={<ResidentsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/store/pos" element={<StoreRoute><StorePOSPage /></StoreRoute>} />
        <Route path="/store/products" element={<StoreRoute><StoreProductsPage /></StoreRoute>} />
        <Route path="/store/purchases" element={<StoreRoute><StorePurchasesPage /></StoreRoute>} />
        <Route path="/store/stock" element={<StoreRoute><StoreStockPage /></StoreRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/apply"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

