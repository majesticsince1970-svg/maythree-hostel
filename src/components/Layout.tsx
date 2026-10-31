import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BedDouble, Users, Clock,
  Landmark, Store, BarChart3, Settings,
  LogOut, Menu, X, ChevronDown, ChevronRight,
  ClipboardList, QrCode, CreditCard, Receipt, Wallet,
  ShoppingCart, Package, TruckIcon, ClipboardCheck,
  Building2, Tablet, UserCheck, UserMinus
} from 'lucide-react'

interface SubItem {
  path: string
  label: string
  icon?: any
}

interface NavModule {
  id: string
  path: string
  label: string
  icon: any
  roles: string[]
  subPaths: string[]
  subItems?: SubItem[]
}

const navModules: NavModule[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'staff'],
    subPaths: ['/dashboard'],
  },
  {
    id: 'admissions',
    path: '/admissions',
    label: 'Admissions & Rooms',
    icon: BedDouble,
    roles: ['admin', 'staff'],
    subPaths: ['/admissions', '/applications', '/rooms'],
    subItems: [
      { path: '/admissions?tab=applications', label: 'New Admissions', icon: ClipboardList },
      { path: '/admissions?tab=rooms', label: 'Bed Board', icon: BedDouble },
      { path: '/admissions?tab=vacate', label: 'Vacate Resident', icon: UserMinus },
      { path: '/admissions?tab=qr', label: 'QR Public Form', icon: QrCode },
    ]
  },
  {
    id: 'residents',
    path: '/residents',
    label: 'Residents',
    icon: Users,
    roles: ['admin', 'staff'],
    subPaths: ['/residents'],
  },
  {
    id: 'attendance',
    path: '/attendance',
    label: 'Attendance (In/Out)',
    icon: Clock,
    roles: ['admin', 'staff'],
    subPaths: ['/attendance', '/attendance/kiosk'],
    subItems: [
      { path: '/attendance?tab=live', label: 'Who is In / Out', icon: UserCheck },
      { path: '/attendance?tab=log', label: 'Movement Log', icon: Clock },
      { path: '/attendance/kiosk', label: 'Entrance Kiosk', icon: Tablet },
    ]
  },
  {
    id: 'accounts',
    path: '/accounts',
    label: 'Accounts',
    icon: Landmark,
    roles: ['admin', 'staff'],
    subPaths: ['/accounts', '/payments', '/expenses', '/cash'],
    subItems: [
      { path: '/accounts?tab=payments', label: 'Rent Collection', icon: CreditCard },
      { path: '/accounts?tab=expenses', label: 'Hostel Expenses', icon: Receipt },
      { path: '/accounts?tab=cash', label: 'Cash & Bank Book', icon: Wallet },
    ]
  },
  {
    id: 'store',
    path: '/store',
    label: 'Store',
    icon: Store,
    roles: ['admin', 'staff', 'store_staff'],
    subPaths: ['/store', '/store/pos', '/store/products', '/store/purchases', '/store/stock'],
    subItems: [
      { path: '/store?tab=pos', label: 'Store POS & Orders', icon: ShoppingCart },
      { path: '/store?tab=products', label: 'Products Catalog', icon: Package },
      { path: '/store?tab=purchases', label: 'Purchases', icon: TruckIcon },
      { path: '/store?tab=stock', label: 'Stock & Audits', icon: ClipboardCheck },
    ]
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['admin'],
    subPaths: ['/reports'],
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['admin'],
    subPaths: ['/settings'],
  },
]

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const filteredModules = navModules.filter(m => profile && m.roles.includes(profile.role))

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isModuleActive = (module: NavModule) => {
    if (location.pathname === module.path) return true
    return module.subPaths.some(sp => location.pathname === sp || location.pathname.startsWith(sp + '/'))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <h1 className="font-bold text-base">MayThree Hostel</h1>
        </div>
        <div className="w-8" />
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col justify-between transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight block">MayThree</span>
                <span className="text-[11px] text-muted-foreground block -mt-0.5">Hostel Operations</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Module Navigation List */}
          <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
            {filteredModules.map((module) => {
              const active = isModuleActive(module)
              const Icon = module.icon

              return (
                <div key={module.id} className="space-y-1">
                  <Link
                    to={module.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground")} />
                      <span className="truncate">{module.label}</span>
                    </div>
                    {module.subItems && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md", active ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground/60")}>
                        {module.subItems.length}
                      </span>
                    )}
                  </Link>

                  {/* Sub-item Quick Links for active modules */}
                  {active && module.subItems && (
                    <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-primary/30 ml-4 my-1">
                      {module.subItems.map((sub) => {
                        const SubIcon = sub.icon
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                          >
                            {SubIcon && <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* User profile & Sign Out */}
        <div className="p-3 border-t bg-card/60 backdrop-blur">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-none">{profile?.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize mt-1 leading-none">{profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main App Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
