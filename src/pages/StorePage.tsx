import { useSearchParams } from 'react-router-dom'
import { StorePOSPage } from '@/pages/StorePOSPage'
import { StoreProductsPage } from '@/pages/StoreProductsPage'
import { StorePurchasesPage } from '@/pages/StorePurchasesPage'
import { StoreStockPage } from '@/pages/StoreStockPage'
import { Button } from '@/components/ui/button'
import { Store, ShoppingCart, Package, TruckIcon, ClipboardCheck } from 'lucide-react'

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'pos'

  const setTab = (tab: string) => {
    setSearchParams({ tab })
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Hostel Store & Merchandise
          </h1>
          <p className="text-muted-foreground text-sm">
            Point of sale billing, Magic Tumbler orders, inventory catalog, stock adjustments and supplier purchases
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 rounded-xl border">
        <Button
          variant={currentTab === 'pos' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('pos')}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          Point of Sale (POS)
        </Button>
        <Button
          variant={currentTab === 'products' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('products')}
        >
          <Package className="h-4 w-4 mr-1.5" />
          Products Catalog
        </Button>
        <Button
          variant={currentTab === 'purchases' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('purchases')}
        >
          <TruckIcon className="h-4 w-4 mr-1.5" />
          Supplier Purchases
        </Button>
        <Button
          variant={currentTab === 'stock' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-9"
          onClick={() => setTab('stock')}
        >
          <ClipboardCheck className="h-4 w-4 mr-1.5" />
          Stock & Audit Count
        </Button>
      </div>

      {/* Module Content */}
      {currentTab === 'pos' && <StorePOSPage />}
      {currentTab === 'products' && <StoreProductsPage />}
      {currentTab === 'purchases' && <StorePurchasesPage />}
      {currentTab === 'stock' && <StoreStockPage />}
    </div>
  )
}
