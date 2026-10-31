import { useState } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, TruckIcon, Trash2, Package } from 'lucide-react'
import type { Product } from '@/types/database'

interface PurchaseItem {
  product: Product
  qty: number
  unitCost: number
}

export function StorePurchasesPage() {
  const { products, vendors, stockPurchases, recordPurchase } = useDemoData()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [vendorId, setVendorId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [paidFrom, setPaidFrom] = useState('bank')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQty, setItemQty] = useState('')
  const [itemCost, setItemCost] = useState('')

  const addItem = () => {
    const product = products.find(p => p.id === selectedProductId)
    if (!product || !itemQty || !itemCost) return
    if (items.some(i => i.product.id === product.id)) {
      addToast({ type: 'error', title: 'Product already added' })
      return
    }
    setItems(prev => [...prev, { product, qty: Number(itemQty), unitCost: Number(itemCost) }])
    setSelectedProductId('')
    setItemQty('')
    setItemCost('')
  }

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId))
  }

  const total = items.reduce((s, i) => s + i.qty * i.unitCost, 0)

  const handleSubmit = () => {
    if (items.length === 0) return

    recordPurchase(
      vendorId || null,
      invoiceNo,
      paidFrom,
      items.map(i => ({ productId: i.product.id, qty: i.qty, unitCost: i.unitCost }))
    )

    addToast({ type: 'success', title: 'Purchase recorded', description: `${items.length} items, total ${formatCurrency(total)}` })
    resetForm()
  }

  const resetForm = () => {
    setShowForm(false)
    setItems([])
    setVendorId('')
    setInvoiceNo('')
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setPaidFrom('bank')
    setSelectedProductId('')
    setItemQty('')
    setItemCost('')
  }

  // Build display list from reactive stockPurchases state
  const purchaseList = [...stockPurchases]
    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))
    .map(p => {
      const itemCount = p.items?.length || 0
      const purchaseTotal = p.items?.reduce((s, i) => s + i.qty * i.unit_cost, 0) || 0
      return {
        id: p.id,
        date: p.purchase_date,
        vendor: p.vendor?.name || 'Unknown Vendor',
        invoice: p.invoice_no || '—',
        items: itemCount,
        total: purchaseTotal,
      }
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Purchases</h1>
          <p className="text-muted-foreground text-sm">Record goods received from suppliers</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Purchase
        </Button>
      </div>

      {/* Purchase list */}
      <div className="grid gap-4">
        {purchaseList.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No purchases recorded yet. Click &quot;New Purchase&quot; to add one.
            </CardContent>
          </Card>
        ) : (
          purchaseList.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <TruckIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{p.vendor}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(p.date)} · {p.invoice} · {p.items} items</p>
                  </div>
                </div>
                <p className="font-bold text-lg">{formatCurrency(p.total)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Purchase Dialog */}
      <Dialog open={showForm} onClose={resetForm}>
        <DialogHeader>
          <DialogTitle>Record Stock Purchase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Purchase details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Invoice No</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-XXX" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor</Label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Paid From</Label>
              <select value={paidFrom} onChange={(e) => setPaidFrom(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="bank">Bank / UPI</option>
                <option value="petty_cash">Petty Cash</option>
                <option value="store_counter">Store Counter</option>
              </select>
            </div>
          </div>

          {/* Add item */}
          <div className="border-t pt-4">
            <p className="font-semibold text-sm mb-3">Add Items</p>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <select value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); const p = products.find(x => x.id === e.target.value); if (p) setItemCost(String(p.cost_price)) }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Product...</option>
                  {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} placeholder="Qty" min={1} />
              </div>
              <div className="col-span-3">
                <Input type="number" value={itemCost} onChange={(e) => setItemCost(e.target.value)} placeholder="Unit cost" min={0} />
              </div>
              <div className="col-span-2">
                <Button onClick={addItem} disabled={!selectedProductId || !itemQty || !itemCost} className="w-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.qty} × {formatCurrency(item.unitCost)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{formatCurrency(item.qty * item.unitCost)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="font-semibold">Total ({items.length} items)</span>
                <span className="font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetForm}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={items.length === 0}>
            Record Purchase · {formatCurrency(total)}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
