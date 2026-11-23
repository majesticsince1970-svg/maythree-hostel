import React, { useRef } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BRAND } from '@/lib/brandConfig'
import { PrintTemplate } from '@/components/PrintTemplate'
import { printIsolatedReceipt } from '@/lib/printUtils'
import type { CheckoutReceipt } from '@/types/database'
import { Printer, Download, CheckCircle2, ShieldCheck, X } from 'lucide-react'

interface CheckoutReceiptModalProps {
  receipt: CheckoutReceipt | null
  open: boolean
  onClose: () => void
}

export function CheckoutReceiptModal({ receipt, open, onClose }: CheckoutReceiptModalProps) {
  const printableRef = useRef<HTMLDivElement>(null)
  if (!receipt) return null

  const handlePrint = () => {
    if (printableRef.current) {
      printIsolatedReceipt(printableRef.current.innerHTML, `Settlement-${receipt.receipt_no}`)
    } else {
      window.print()
    }
  }

  const isRefund = receipt.settlement_type === 'refund'

  // Calculate days stayed
  const admDate = new Date(receipt.admission_date)
  const coDate = new Date(receipt.checkout_date)
  const diffTime = Math.abs(coDate.getTime() - admDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-4">
        {/* Modal Top Bar (Hidden when printing) */}
        <DialogHeader className="no-print">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg text-primary">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Checkout & Settlement Invoice
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {receipt.receipt_no}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Official A4 settlement voucher for resident checkout and hostel cash accounts.
          </DialogDescription>
        </DialogHeader>

        {/* Action Controls (Hidden when printing) */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/50 rounded-xl border no-print">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-foreground">Standard A4 Document Format · Direct Print or PDF Export</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="text-xs h-8 gap-1.5 bg-[#10375C] hover:bg-[#10375C]/90 text-white font-semibold">
              <Printer className="h-3.5 w-3.5" />
              Print A4 Receipt
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-8">
              Close
            </Button>
          </div>
        </div>

        {/* ── ISOLATED A4 PRINTABLE DOCUMENT ── */}
        <div ref={printableRef} className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm max-h-[75vh] overflow-y-auto">
          <PrintTemplate
            documentTitle="TAX INVOICE / CHECKOUT SETTLEMENT RECEIPT"
            referenceNo={receipt.receipt_no}
            date={formatDate(receipt.checkout_date)}
            guestDetails={{
              name: receipt.resident_name,
              phone: receipt.phone,
              roomBed: `Room ${receipt.room_no} · Bed ${receipt.bed_label}`,
              admissionDate: formatDate(receipt.admission_date),
              checkoutDate: formatDate(receipt.checkout_date),
              duration: `${diffDays} Days stayed`,
            }}
            signatoryName={receipt.issued_by || 'Staff Incharge'}
            declarationText="All dues settled. Room vacated, belongings cleared, and keys returned in good condition."
            termsNote={`Settlement processed via ${receipt.payment_mode.toUpperCase()}${
              receipt.account_id ? ' · Posted to Cash Ledger' : ''
            }. Advance deposit marked reconciled.`}
          >
            {/* Itemized Table */}
            <div className="space-y-3">
              <table className="w-full text-xs border border-neutral-300">
                <thead>
                  <tr className="bg-[#10375C]/10 border-b border-neutral-300 text-neutral-900">
                    <th className="text-left p-2.5 font-bold w-12 text-center">S.No</th>
                    <th className="text-left p-2.5 font-bold">Particulars / Description</th>
                    <th className="text-right p-2.5 font-bold w-36">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {/* 1. Advance Security Deposit */}
                  <tr>
                    <td className="p-2.5 text-center font-mono">1</td>
                    <td className="p-2.5 font-semibold text-neutral-900">
                      Security Deposit / Advance Received at Admission
                      <span className="block text-[10px] text-neutral-500 font-normal">
                        Received on {formatDate(receipt.admission_date)} · Fully reconciled
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-neutral-900">
                      {formatCurrency(receipt.advance_amount)}
                    </td>
                  </tr>

                  {/* 2. Unpaid Rent Dues */}
                  <tr className="bg-neutral-50/60">
                    <td className="p-2.5 text-center font-mono">2</td>
                    <td className="p-2.5">
                      <p className="font-semibold text-neutral-900">Less: Pending Rent & Dues</p>
                      {receipt.rent_breakdown && receipt.rent_breakdown.length > 0 ? (
                        <div className="mt-1 pl-3 space-y-0.5 text-[11px] text-neutral-600">
                          {receipt.rent_breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between pr-2">
                              <span>• {item.label} (Due: {formatCurrency(item.rent_due)}, Paid: {formatCurrency(item.amount_paid)})</span>
                              <span className="font-mono text-neutral-800">{formatCurrency(item.balance)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 pl-3">No pending rent dues</p>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold text-rose-600">
                      - {formatCurrency(receipt.pending_rent_deducted)}
                    </td>
                  </tr>

                  {/* 3. Other Deductions */}
                  <tr className="bg-neutral-50/60">
                    <td className="p-2.5 text-center font-mono">3</td>
                    <td className="p-2.5">
                      <p className="font-semibold text-neutral-900">Less: Other Deductions (Damage / Cleaning / Store Dues)</p>
                      {receipt.deductions_breakdown && receipt.deductions_breakdown.length > 0 ? (
                        <div className="mt-1 pl-3 space-y-0.5 text-[11px] text-neutral-600">
                          {receipt.deductions_breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between pr-2">
                              <span>• {item.description}</span>
                              <span className="font-mono text-neutral-800">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 pl-3">Nil deductions</p>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold text-rose-600">
                      - {formatCurrency(receipt.other_deductions)}
                    </td>
                  </tr>

                  {/* Final Net Settlement Row */}
                  <tr className="border-t-2 border-neutral-900 bg-[#10375C]/10 font-bold text-sm">
                    <td className="p-3 text-center font-bold">#</td>
                    <td className="p-3 text-neutral-900">
                      {isRefund ? 'FINAL REFUND AMOUNT ISSUED TO RESIDENT' : 'BALANCE AMOUNT PAYABLE BY RESIDENT'}
                      <span className="block text-[10px] text-neutral-600 font-normal uppercase">
                        Payment Mode: {receipt.payment_mode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-base text-[#10375C]">
                      {formatCurrency(receipt.final_refund_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in Words Card */}
              <div className="p-3 bg-neutral-100/70 border border-neutral-300 rounded text-xs space-y-0.5">
                <span className="text-neutral-500 font-semibold block text-[10px] uppercase">Amount in Words (INR):</span>
                <p className="font-bold text-neutral-900 uppercase font-mono">{receipt.amount_in_words}</p>
              </div>

              {receipt.notes && (
                <div className="text-[11px] text-neutral-600 p-2 border border-dashed rounded">
                  <span className="font-semibold text-neutral-700">Remarks: </span>
                  {receipt.notes}
                </div>
              )}
            </div>
          </PrintTemplate>
        </div>
      </div>
    </Dialog>
  )
}
