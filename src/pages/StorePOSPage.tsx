import { useState } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Banknote, Printer, Sparkles, User, Receipt, CheckCircle2
} from 'lucide-react'
import type { Product, SalePaymentMode } from '@/types/database'

interface CartItem {
  product: Product
  qty: number
}

interface CompletedSaleReceipt {
  id: string
  date: string
  residentName?: string
  items: CartItem[]
  total: number
  mode: SalePaymentMode
}

export function StorePOSPage() {
  const { products, residents, sales, recordSale } = useDemoData()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMode, setPaymentMode] = useState<SalePaymentMode>('cash')
  const [selectedResidentId, setSelectedResidentId] = useState<string>('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [completedReceipt, setCompletedReceipt] = useState<CompletedSaleReceipt | null>(null)

  const magicTumbler = products.find(p => p.name.toLowerCase().includes('magic tumbler'))

  const filteredProducts = products.filter(p =>
    p.is_active && (
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || 'General').toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
    )
  )

  const categories = Array.from(new Set(products.map(p => p.category || 'General')))

  const addToCart = (product: Product) => {
    const stock = product.stock_on_hand ?? 0
    if (stock <= 0) {
      addToast({ type: 'error', title: 'Out of Stock', description: `${product.name} is currently out of stock.` })
      return
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.qty >= stock) {
          addToast({ type: 'error', title: 'Stock Limit Reached', description: `Only ${stock} unit(s) available in stock.` })
          return prev
        }
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.product.id === productId) {
            const currentStock = products.find(p => p.id === productId)?.stock_on_hand ?? i.product.stock_on_hand ?? 0
            const nextQty = i.qty + delta
            if (nextQty > currentStock) {
              addToast({ type: 'error', title: 'Stock Limit Reached', description: `Maximum available is ${currentStock}.` })
              return i
            }
            return { ...i, qty: Math.max(0, nextQty) }
          }
          return i
        })
        .filter(i => i.qty > 0)
    })
  }

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const total = cart.reduce((s, i) => s + i.product.selling_price * i.qty, 0)

  const handleCheckout = () => {
    if (cart.length === 0) return

    for (const item of cart) {
      const liveProduct = products.find(p => p.id === item.product.id)
      const liveStock = liveProduct?.stock_on_hand ?? 0
      if (item.qty > liveStock) {
        addToast({
          type: 'error',
          title: 'Insufficient Stock',
          description: `Only ${liveStock} units of ${item.product.name} remaining.`
        })
        return
      }
    }

    const salePayload = cart.map(i => ({
      productId: i.product.id,
      qty: i.qty,
      unitPrice: i.product.selling_price
    }))

    const resident = residents.find(r => r.id === selectedResidentId)
    const sale = recordSale(salePayload, paymentMode, selectedResidentId || null)

    setCompletedReceipt({
      id: sale.id,
      date: sale.sale_date,
      residentName: resident?.application?.full_name || 'Walk-in Guest',
      items: [...cart],
      total,
      mode: paymentMode
    })

    addToast({
      type: 'success',
      title: 'Order Placed Successfully!',
      description: `Billed ${formatCurrency(total)} via ${paymentMode.toUpperCase()}. Stock updated.`
    })

    setCart([])
    setSelectedResidentId('')
    setPaymentMode('cash')
    setShowReceipt(true)
  }

  const activeResidents = residents.filter(r => r.status === 'active')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Store Point of Sale & Orders</h1>
          <p className="text-sm text-muted-foreground">Bill hostel residents or walk-ins, track real-time inventory</p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1.5 bg-primary/5 self-start sm:self-auto">
          <ShoppingCart className="h-4 w-4 mr-2 text-primary" />
          {cart.reduce((s, i) => s + i.qty, 0)} items · {formatCurrency(total)}
        </Badge>
      </div>

      {/* Featured Magic Tumbler Order Banner */}
      {magicTumbler && (
        <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-sm">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Magic Tumbler</h3>
                  <Badge variant="success" className="text-xs">Featured Item</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hostel special thermal tumbler · Price: <span className="font-bold text-foreground">{formatCurrency(magicTumbler.selling_price)}</span> ·
                  <span className="ml-1 text-green-700 dark:text-green-400 font-semibold">{magicTumbler.stock_on_hand ?? 25} in stock</span>
                </p>
              </div>
            </div>
            <Button
              onClick={() => addToCart(magicTumbler)}
              className="font-semibold shadow-sm sm:w-auto w-full"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Order Magic Tumbler
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, category, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {categories.map(cat => {
            const catProducts = filteredProducts.filter(p => (p.category || 'General') === cat)
            if (catProducts.length === 0) return null
            return (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {catProducts.map(product => {
                    const stock = product.stock_on_hand ?? 0
                    const isOutOfStock = stock <= 0
                    const isLowStock = stock > 0 && stock <= product.reorder_level

                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className={`p-3 border rounded-xl text-left transition-all ${
                          isOutOfStock
                            ? 'opacity-50 cursor-not-allowed bg-muted/40 border-muted'
                            : 'hover:border-primary hover:bg-primary/5 hover:shadow-sm bg-card'
                        }`}
                      >
                        <p className="font-semibold text-sm truncate" title={product.name}>{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.unit}</p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50">
                          <p className="font-bold text-sm text-primary">{formatCurrency(product.selling_price)}</p>
                          <Badge
                            variant={isOutOfStock ? 'destructive' : isLowStock ? 'warning' : 'outline'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {isOutOfStock ? '0 left' : `${stock} left`}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Current Order / Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 shadow-sm border-2">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Current Order</span>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setCart([])} className="h-7 text-xs text-destructive">
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Resident Selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5" /> Customer / Resident
                </label>
                <select
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Walk-in Guest</option>
                  {activeResidents.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.application?.full_name} (Room {r.bed?.room?.room_no || '—'})
                    </option>
                  ))}
                </select>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No items in order</p>
                  <p className="text-xs">Click items or order Magic Tumbler above</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-semibold truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.selling_price)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => updateQty(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            onClick={() => updateQty(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.product.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-bold text-sm w-16 text-right text-primary">
                          {formatCurrency(item.product.selling_price * item.qty)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Payable</span>
                      <span className="text-2xl text-primary">{formatCurrency(total)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        type="button"
                        variant={paymentMode === 'cash' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setPaymentMode('cash')}
                      >
                        <Banknote className="h-3.5 w-3.5 mr-1" /> Cash
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMode === 'UPI' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setPaymentMode('UPI')}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> UPI
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMode === 'on_account' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setPaymentMode('on_account')}
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1" /> Account
                      </Button>
                    </div>

                    <Button
                      className="w-full py-5 text-base font-bold shadow-md"
                      onClick={handleCheckout}
                    >
                      Place Order · {formatCurrency(total)}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders Section */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Recent Store Orders
          </CardTitle>
          <Badge variant="outline">{sales.length} orders recorded</Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {sales.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">No orders completed yet</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {sales.slice(0, 10).map((sale) => {
                const resident = residents.find(r => r.id === sale.resident_id)
                const itemsCount = sale.items?.reduce((s, i) => s + i.qty, 0) || 1
                return (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Order #{sale.id.slice(-6)}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{sale.payment_mode}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(sale.sale_date)} · Customer: {resident?.application?.full_name || 'Walk-in'} · {itemsCount} item(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">{formatCurrency(sale.total)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setCompletedReceipt({
                            id: sale.id,
                            date: sale.sale_date,
                            residentName: resident?.application?.full_name || 'Walk-in Guest',
                            items: (sale.items || []).map(i => ({
                              product: i.product || products.find(p => p.id === i.product_id) || {
                                id: i.product_id,
                                name: 'Store Item',
                                category: 'General',
                                unit: 'piece',
                                barcode: null,
                                cost_price: i.unit_cost,
                                selling_price: i.unit_price,
                                reorder_level: 10,
                                is_active: true
                              },
                              qty: i.qty
                            })),
                            total: sale.total,
                            mode: sale.payment_mode
                          })
                          setShowReceipt(true)
                        }}
                      >
                        Receipt
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Itemized Sale Receipt Modal */}
      <Dialog open={showReceipt} onClose={() => setShowReceipt(false)}>
        {completedReceipt && (
          <div className="space-y-4">
            <div className="text-center pb-2 border-b">
              <h2 className="text-lg font-bold text-foreground">MayThree Hostel Store</h2>
              <p className="text-xs text-muted-foreground">Order #{completedReceipt.id}</p>
              <p className="text-xs text-muted-foreground">{completedReceipt.date} · {completedReceipt.residentName}</p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border-b pb-3">
              {completedReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{it.product.name}</p>
                    <p className="text-muted-foreground">{it.qty} × {formatCurrency(it.product.selling_price)}</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(it.qty * it.product.selling_price)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Payment Method</span>
                <span className="uppercase font-semibold text-foreground">{completedReceipt.mode}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-primary pt-1 border-t">
                <span>Amount Paid</span>
                <span>{formatCurrency(completedReceipt.total)}</span>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowReceipt(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}
