import { useState } from 'react'
import { useDemoData } from '@/contexts/DemoDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/loading'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { Product } from '@/types/database'
import { Search, Package, AlertTriangle, Plus, Pencil } from 'lucide-react'

interface ProductFormData {
  name: string
  category: string
  unit: string
  barcode: string
  cost_price: string
  selling_price: string
  reorder_level: string
}

const emptyForm: ProductFormData = {
  name: '',
  category: '',
  unit: 'piece',
  barcode: '',
  cost_price: '',
  selling_price: '',
  reorder_level: '10',
}

function productToForm(p: Product): ProductFormData {
  return {
    name: p.name,
    category: p.category || '',
    unit: p.unit,
    barcode: p.barcode || '',
    cost_price: String(p.cost_price),
    selling_price: String(p.selling_price),
    reorder_level: String(p.reorder_level),
  }
}

export function StoreProductsPage() {
  const { products, addProduct, updateProduct } = useDemoData()
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  )

  const totalValue = products.reduce((s, p) => s + p.cost_price * (p.stock_on_hand || 0), 0)
  const lowStock = products.filter(p => (p.stock_on_hand || 0) <= p.reorder_level)

  const openAdd = () => {
    setForm(emptyForm)
    setEditingProduct(null)
    setShowAddDialog(true)
  }

  const openEdit = (product: Product) => {
    setForm(productToForm(product))
    setEditingProduct(product)
    setShowAddDialog(true)
  }

  const closeDialog = () => {
    setShowAddDialog(false)
    setEditingProduct(null)
    setForm(emptyForm)
  }

  const updateField = (field: keyof ProductFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      addToast({ type: 'error', title: 'Product name is required' })
      return
    }
    const costPrice = parseFloat(form.cost_price)
    const sellingPrice = parseFloat(form.selling_price)
    const reorderLevel = parseInt(form.reorder_level, 10)

    if (isNaN(costPrice) || costPrice < 0) {
      addToast({ type: 'error', title: 'Enter a valid cost price' })
      return
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      addToast({ type: 'error', title: 'Enter a valid selling price' })
      return
    }
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      addToast({ type: 'error', title: 'Enter a valid reorder level' })
      return
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: form.name.trim(),
        category: form.category.trim() || null,
        unit: form.unit.trim() || 'piece',
        barcode: form.barcode.trim() || null,
        cost_price: costPrice,
        selling_price: sellingPrice,
        reorder_level: reorderLevel,
      })
      addToast({ type: 'success', title: 'Product updated', description: `${form.name} has been updated.` })
    } else {
      addProduct({
        name: form.name.trim(),
        category: form.category.trim() || null,
        unit: form.unit.trim() || 'piece',
        barcode: form.barcode.trim() || null,
        cost_price: costPrice,
        selling_price: sellingPrice,
        reorder_level: reorderLevel,
        is_active: true,
        stock_on_hand: 0,
      })
      addToast({ type: 'success', title: 'Product added', description: `${form.name} has been added to inventory.` })
    }

    closeDialog()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">{products.length} products · Stock value: {formatCurrency(totalValue)}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isAdmin && (
            <Button onClick={openAdd} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="font-semibold text-amber-800">Low Stock Alert ({lowStock.length} items)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(p => (
                <Badge key={p.id} variant="warning">{p.name}: {p.stock_on_hand} left</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No products found" description="No products match your search." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const margin = p.selling_price > 0
                      ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(0)
                      : '0'
                    const stockValue = p.cost_price * (p.stock_on_hand || 0)
                    const isLow = (p.stock_on_hand || 0) <= p.reorder_level
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{p.name}</p>
                              {p.barcode && <p className="text-xs text-muted-foreground font-mono">{p.barcode}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{p.category || '—'}</TableCell>
                        <TableCell>{formatCurrency(p.cost_price)}</TableCell>
                        <TableCell>{formatCurrency(p.selling_price)}</TableCell>
                        <TableCell className="text-green-600">{margin}%</TableCell>
                        <TableCell>
                          <Badge variant={isLow ? (p.stock_on_hand || 0) <= p.reorder_level / 2 ? 'destructive' : 'warning' : 'outline'}>
                            {p.stock_on_hand} {p.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(stockValue)}</TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => {
              const margin = p.selling_price > 0
                ? ((p.selling_price - p.cost_price) / p.selling_price * 100).toFixed(0)
                : '0'
              const isLow = (p.stock_on_hand || 0) <= p.reorder_level
              return (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{p.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.category || 'No category'} · {margin}% margin</p>
                        {p.barcode && <p className="text-xs text-muted-foreground font-mono">{p.barcode}</p>}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">{formatCurrency(p.selling_price)}</p>
                        <Badge variant={isLow ? 'warning' : 'outline'} className="text-[10px]">
                          {p.stock_on_hand} {p.unit}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="mt-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Add / Edit Product Dialog */}
      <Dialog open={showAddDialog} onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-name">Product Name *</Label>
            <Input
              id="prod-name"
              placeholder="e.g. Maggi Noodles"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prod-category">Category</Label>
              <Input
                id="prod-category"
                placeholder="e.g. Snacks"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-unit">Unit</Label>
              <Input
                id="prod-unit"
                placeholder="e.g. packet"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-barcode">Barcode</Label>
            <Input
              id="prod-barcode"
              placeholder="e.g. 8901234567890"
              value={form.barcode}
              onChange={(e) => updateField('barcode', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prod-cost">Cost Price (₹) *</Label>
              <Input
                id="prod-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.cost_price}
                onChange={(e) => updateField('cost_price', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-sell">Selling Price (₹) *</Label>
              <Input
                id="prod-sell"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.selling_price}
                onChange={(e) => updateField('selling_price', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-reorder">Reorder Level</Label>
            <Input
              id="prod-reorder"
              type="number"
              min="0"
              placeholder="10"
              value={form.reorder_level}
              onChange={(e) => updateField('reorder_level', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {editingProduct ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
