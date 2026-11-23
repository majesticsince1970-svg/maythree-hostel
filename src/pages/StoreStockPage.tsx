import { useState } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { ClipboardCheck, Package, ArrowUp, ArrowDown, Search, AlertTriangle, Trash2 } from 'lucide-react'

export function StoreStockPage() {
  const { products, stockMovements, recordStockAdjustment, recordDamageExpiry } = useDemoData()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(false)
  const [showDamage, setShowDamage] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [countedQty, setCountedQty] = useState('')
  const [countReason, setCountReason] = useState('')
  const [damageQty, setDamageQty] = useState('')
  const [damageType, setDamageType] = useState<'damage' | 'expiry'>('damage')
  const [damageReason, setDamageReason] = useState('')

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const systemQty = selectedProduct?.stock_on_hand || 0
  const difference = countedQty ? Number(countedQty) - systemQty : 0

  // Build display-friendly movements by joining with products
  const recentMovements = [...stockMovements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map(m => {
      const product = products.find(p => p.id === m.product_id)
      return {
        id: m.id,
        date: m.date,
        product: product?.name || 'Unknown',
        type: m.type,
        qty: m.qty,
      }
    })

  const handlePhysicalCount = () => {
    if (!selectedProductId || !countedQty) return
    const counted = Number(countedQty)
    const reason = countReason.trim() || 'Stock matches'

    recordStockAdjustment(selectedProductId, counted, reason)

    addToast({
      type: difference === 0 ? 'success' : 'info',
      title: 'Physical count recorded',
      description: difference === 0
        ? `${selectedProduct?.name}: Stock matches (${systemQty})`
        : `${selectedProduct?.name}: Difference of ${difference > 0 ? '+' : ''}${difference} units`
    })
    setShowCount(false)
    setSelectedProductId('')
    setCountedQty('')
    setCountReason('')
  }

  const handleDamage = () => {
    if (!selectedProductId || !damageQty || !damageReason.trim()) return
    const qty = Number(damageQty)
    const stock = selectedProduct?.stock_on_hand || 0

    if (qty > stock) {
      addToast({
        type: 'error',
        title: 'Insufficient stock',
        description: `Cannot write off ${qty} units — only ${stock} on hand`
      })
      return
    }

    recordDamageExpiry(selectedProductId, qty, damageType, damageReason.trim())

    addToast({
      type: 'info',
      title: `${damageType === 'damage' ? 'Damage' : 'Expiry'} recorded`,
      description: `${selectedProduct?.name}: ${qty} units written off`
    })
    setShowDamage(false)
    setSelectedProductId('')
    setDamageQty('')
    setDamageReason('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground text-sm">Movements, counts, and adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowDamage(true); setSelectedProductId('') }}>
            <Trash2 className="h-4 w-4 mr-2" /> Record Damage/Expiry
          </Button>
          <Button onClick={() => { setShowCount(true); setSelectedProductId('') }}>
            <ClipboardCheck className="h-4 w-4 mr-2" /> Physical Count
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Stock overview table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => {
                const isLow = (p.stock_on_hand || 0) <= p.reorder_level
                const isCritical = (p.stock_on_hand || 0) <= p.reorder_level / 2
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {p.name}
                      </div>
                    </TableCell>
                    <TableCell>{p.category || '—'}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell className="font-bold">{p.stock_on_hand}</TableCell>
                    <TableCell>{p.reorder_level}</TableCell>
                    <TableCell>
                      {isCritical ? (
                        <Badge variant="destructive">Critical</Badge>
                      ) : isLow ? (
                        <Badge variant="warning">Low</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No stock movements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentMovements.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${m.qty > 0 ? 'bg-green-100' : (m.type === 'damage' || m.type === 'expiry') ? 'bg-orange-100' : 'bg-red-100'}`}>
                      {m.qty > 0 ? <ArrowUp className="h-4 w-4 text-green-600" /> : (m.type === 'damage' || m.type === 'expiry') ? <AlertTriangle className="h-4 w-4 text-orange-600" /> : <ArrowDown className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.product}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.type}</p>
                    </div>
                  </div>
                  <Badge variant={m.qty > 0 ? 'success' : (m.type === 'damage' || m.type === 'expiry') ? 'warning' : 'destructive'}>
                    {m.qty > 0 ? '+' : ''}{m.qty}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Physical Count Dialog */}
      <Dialog open={showCount} onClose={() => { setShowCount(false); setSelectedProductId(''); setCountedQty(''); setCountReason('') }}>
        <DialogHeader>
          <DialogTitle>Physical Stock Count</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Product *</Label>
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); setCountedQty('') }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select product...</option>
              {products.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name} (System: {p.stock_on_hand} {p.unit})</option>
              ))}
            </select>
          </div>
          {selectedProductId && (
            <>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">System quantity: <strong>{systemQty} {selectedProduct?.unit}</strong></p>
              </div>
              <div>
                <Label>Counted Quantity *</Label>
                <Input
                  type="number"
                  value={countedQty}
                  onChange={(e) => setCountedQty(e.target.value)}
                  placeholder="Enter actual count"
                  className="mt-1"
                  min={0}
                />
              </div>
              {countedQty && (
                <div className={`p-3 rounded-lg ${difference === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                  <p className="font-semibold">
                    {difference === 0 ? '✅ Stock matches!' : `⚠️ Difference: ${difference > 0 ? '+' : ''}${difference} ${selectedProduct?.unit}`}
                  </p>
                </div>
              )}
              {countedQty && difference !== 0 && (
                <div>
                  <Label>Reason for difference *</Label>
                  <Textarea
                    value={countReason}
                    onChange={(e) => setCountReason(e.target.value)}
                    placeholder="Explain the discrepancy..."
                    className="mt-1"
                  />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowCount(false); setSelectedProductId(''); setCountedQty(''); setCountReason('') }}>Cancel</Button>
          <Button
            onClick={handlePhysicalCount}
            disabled={!selectedProductId || !countedQty || (difference !== 0 && !countReason.trim())}
          >
            Submit Count
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Damage/Expiry Dialog */}
      <Dialog open={showDamage} onClose={() => { setShowDamage(false); setSelectedProductId(''); setDamageQty(''); setDamageReason('') }}>
        <DialogHeader>
          <DialogTitle>Record Damage / Expiry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Product *</Label>
            <select
              value={selectedProductId}
              onChange={(e) => { setSelectedProductId(e.target.value); setDamageQty('') }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Select product...</option>
              {products.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_on_hand})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Type *</Label>
            <div className="flex gap-3 mt-1">
              <label className={`flex-1 text-center p-2 border rounded-lg cursor-pointer text-sm ${damageType === 'damage' ? 'border-primary bg-primary/5 font-medium' : ''}`}>
                <input type="radio" value="damage" checked={damageType === 'damage'} onChange={() => setDamageType('damage')} className="sr-only" />
                🔨 Damage
              </label>
              <label className={`flex-1 text-center p-2 border rounded-lg cursor-pointer text-sm ${damageType === 'expiry' ? 'border-primary bg-primary/5 font-medium' : ''}`}>
                <input type="radio" value="expiry" checked={damageType === 'expiry'} onChange={() => setDamageType('expiry')} className="sr-only" />
                📅 Expiry
              </label>
            </div>
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input
              type="number"
              value={damageQty}
              onChange={(e) => setDamageQty(e.target.value)}
              placeholder="Number of units"
              className="mt-1"
              min={1}
              max={selectedProduct?.stock_on_hand || 999}
            />
            {selectedProduct && damageQty && Number(damageQty) > (selectedProduct.stock_on_hand || 0) && (
              <p className="text-xs text-destructive mt-1">
                Cannot exceed stock on hand ({selectedProduct.stock_on_hand})
              </p>
            )}
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea
              value={damageReason}
              onChange={(e) => setDamageReason(e.target.value)}
              placeholder="Describe the damage or expiry..."
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowDamage(false); setSelectedProductId(''); setDamageQty(''); setDamageReason('') }}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDamage}
            disabled={!selectedProductId || !damageQty || !damageReason.trim() || Number(damageQty) > (selectedProduct?.stock_on_hand || 0)}
          >
            Record Write-off
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
