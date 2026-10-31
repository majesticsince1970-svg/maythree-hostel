import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { PageLoading } from '@/components/ui/loading'

// Module Pages
import { DashboardPage } from '@/pages/DashboardPage'
import { AdmissionsPage } from '@/pages/AdmissionsPage'
import { ResidentsPage } from '@/pages/ResidentsPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { AttendanceKioskPage } from '@/pages/AttendanceKioskPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { StorePage } from '@/pages/StorePage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

// Legacy / Direct Sub-Pages (Preserved for compatibility)
import { ApplyPage } from '@/pages/ApplyPage'
import { ApplyDonePage } from '@/pages/ApplyDonePage'
import { LoginPage } from '@/pages/LoginPage'
import { ApplicationsPage } from '@/pages/ApplicationsPage'
import { RoomsPage } from '@/pages/RoomsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { CashPage } from '@/pages/CashPage'
import { StorePOSPage } from '@/pages/StorePOSPage'
import { StoreProductsPage } from '@/pages/StoreProductsPage'
import { StorePurchasesPage } from '@/pages/StorePurchasesPage'
import { StoreStockPage } from '@/pages/StoreStockPage'

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
  return <ProtectedRoute allowedRoles={['admin', 'staff', 'store_staff']}>{children}</ProtectedRoute>
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

      {/* Full-Screen Entrance Kiosk (Without layout sidebar) */}
      <Route
        path="/attendance/kiosk"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <AttendanceKioskPage />
          </ProtectedRoute>
        }
      />

      {/* Staff routes inside main 8-Module Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Module 1: Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Module 2: Admissions & Rooms */}
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />

        {/* Module 3: Residents */}
        <Route path="/residents" element={<ResidentsPage />} />

        {/* Module 4: Attendance (In/Out) */}
        <Route path="/attendance" element={<AttendancePage />} />

        {/* Module 5: Accounts */}
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/cash" element={<CashPage />} />

        {/* Module 6: Store */}
        <Route path="/store" element={<StoreRoute><StorePage /></StoreRoute>} />
        <Route path="/store/pos" element={<StoreRoute><StorePOSPage /></StoreRoute>} />
        <Route path="/store/products" element={<StoreRoute><StoreProductsPage /></StoreRoute>} />
        <Route path="/store/purchases" element={<StoreRoute><StorePurchasesPage /></StoreRoute>} />
        <Route path="/store/stock" element={<StoreRoute><StoreStockPage /></StoreRoute>} />

        {/* Module 7: Reports */}
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />

        {/* Module 8: Settings */}
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
      </Route>

      {/* Default redirect - login page appears first */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}
