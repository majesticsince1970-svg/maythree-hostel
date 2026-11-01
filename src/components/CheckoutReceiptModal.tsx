import React, { useRef } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CheckoutReceipt } from '@/types/database'
import { Printer, Download, Building2, CheckCircle2, ShieldCheck, X } from 'lucide-react'

interface CheckoutReceiptModalProps {
  receipt: CheckoutReceipt | null
  open: boolean
  onClose: () => void
}

export function CheckoutReceiptModal({ receipt, open, onClose }: CheckoutReceiptModalProps) {
  const printableRef = useRef<HTMLDivElement>(null)

  if (!receipt) return null

  const handlePrint = () => {
    window.print()
  }

  const isRefund = receipt.settlement_type === 'refund'

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-4">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Checkout & Settlement Receipt
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {receipt.receipt_no}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Official settlement receipt for resident records and hostel accounts ledger.
          </DialogDescription>
        </DialogHeader>

        {/* Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded-xl border print:hidden">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Ready for A4 / A5 printing & PDF export</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="text-xs h-8 gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Print / Save as PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-8">
              Close
            </Button>
          </div>
        </div>

        {/* ── Printable Receipt Sheet ── */}
        <div
          ref={printableRef}
          className="bg-white text-black p-6 sm:p-8 rounded-xl border-2 border-neutral-300 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 font-sans"
        >
          {/* Header */}
          <div className="text-center pb-5 border-b-2 border-black space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-black" />
              <h1 className="text-2xl font-black uppercase tracking-wider text-black">
                MayThree Women's Hostel
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">
              12/4, Gandhi Nagar, 2nd Main Road, Adyar, Chennai - 600020
            </p>
            <p className="text-xs text-neutral-600 font-medium">
              Phone: +91 98765 43210 · Email: operations@maythree.com
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest rounded">
                Checkout & Advance Refund Receipt
              </span>
            </div>
          </div>

          {/* Receipt Info Bar */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-neutral-300 text-xs">
            <div>
              <p className="text-neutral-500 font-semibold uppercase text-[10px]">Receipt Number</p>
              <p className="font-mono font-bold text-sm text-black">{receipt.receipt_no}</p>
            </div>
            <div className="text-right">
              <p className="text-neutral-500 font-semibold uppercase text-[10px]">Date of Issue</p>
              <p className="font-medium text-black">{formatDate(receipt.checkout_date)}</p>
            </div>
          </div>

          {/* Resident Details */}
          <div className="py-4 border-b border-neutral-300 grid grid-cols-2 gap-y-2 text-xs">
            <div>
              <span className="text-neutral-500">Resident Name: </span>
              <strong className="text-black">{receipt.resident_name}</strong>
            </div>
            <div>
              <span className="text-neutral-500">Contact Phone: </span>
              <strong className="text-black">{receipt.phone}</strong>
            </div>
            <div>
              <span className="text-neutral-500">Room & Bed: </span>
              <strong className="text-black font-mono">Room {receipt.room_no} · Bed {receipt.bed_label}</strong>
            </div>
            <div>
              <span className="text-neutral-500">Admission Date: </span>
              <strong className="text-black">{formatDate(receipt.admission_date)}</strong>
            </div>
            <div>
              <span className="text-neutral-500">Checkout Date: </span>
              <strong className="text-black">{formatDate(receipt.checkout_date)}</strong>
            </div>
            <div>
              <span className="text-neutral-500">Payment Mode: </span>
              <strong className="text-black uppercase">{receipt.payment_mode}</strong>
            </div>
          </div>

          {/* Settlement Breakdown Table */}
          <div className="py-4 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-black">
              Settlement Statement
            </h3>
            <table className="w-full text-xs border border-neutral-300">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-300">
                  <th className="text-left p-2 font-bold text-neutral-800">Particulars / Description</th>
                  <th className="text-right p-2 font-bold text-neutral-800 w-32">Amount (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="p-2 font-semibold">1. Security Deposit / Advance Paid at Admission</td>
                  <td className="p-2 text-right font-mono font-bold">{formatCurrency(receipt.advance_amount)}</td>
                </tr>

                {/* Unpaid Rent Itemization */}
                <tr className="bg-neutral-50">
                  <td className="p-2" colSpan={2}>
                    <p className="font-semibold text-neutral-800">2. Less: Pending Rent & Dues</p>
                    {receipt.rent_breakdown && receipt.rent_breakdown.length > 0 ? (
                      <div className="mt-1 pl-4 space-y-1 text-[11px] text-neutral-600">
                        {receipt.rent_breakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between pr-2">
                            <span>• {item.label} (Due: {formatCurrency(item.rent_due)}, Paid: {formatCurrency(item.amount_paid)})</span>
                            <span className="font-mono text-neutral-800">{formatCurrency(item.balance)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500 pl-4">No unpaid rent</p>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 pl-6 text-neutral-700 italic">Total Rent Deductions</td>
                  <td className="p-2 text-right font-mono font-medium text-red-600">
                    - {formatCurrency(receipt.pending_rent_deducted)}
                  </td>
                </tr>

                {/* Other Deductions Itemization */}
                <tr className="bg-neutral-50">
                  <td className="p-2" colSpan={2}>
                    <p className="font-semibold text-neutral-800">3. Less: Other Deductions (Damage / Dues / Cleaning)</p>
                    {receipt.deductions_breakdown && receipt.deductions_breakdown.length > 0 ? (
                      <div className="mt-1 pl-4 space-y-1 text-[11px] text-neutral-600">
                        {receipt.deductions_breakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between pr-2">
                            <span>• {item.description}</span>
                            <span className="font-mono text-neutral-800">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500 pl-4">None</p>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 pl-6 text-neutral-700 italic">Total Other Deductions</td>
                  <td className="p-2 text-right font-mono font-medium text-red-600">
                    - {formatCurrency(receipt.other_deductions)}
                  </td>
                </tr>

                {/* Net Final Settlement Amount */}
                <tr className="border-t-2 border-black bg-neutral-100 font-bold text-sm">
                  <td className="p-2.5">
                    {isRefund ? 'FINAL REFUND AMOUNT ISSUED TO RESIDENT' : 'BALANCE AMOUNT PAYABLE BY RESIDENT'}
                  </td>
                  <td className="p-2.5 text-right font-mono font-black text-black">
                    {formatCurrency(receipt.final_refund_amount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Amount in Words */}
            <div className="p-2.5 bg-neutral-50 border border-neutral-300 rounded text-xs">
              <span className="text-neutral-500 font-semibold">Amount in Words: </span>
              <strong className="text-black uppercase">{receipt.amount_in_words}</strong>
            </div>

            {receipt.notes && (
              <p className="text-[11px] text-neutral-600 italic">
                Notes: {receipt.notes}
              </p>
            )}
          </div>

          {/* Declaration */}
          <div className="my-5 p-3 bg-neutral-50 border border-neutral-300 rounded text-xs text-neutral-800">
            <strong>Declaration: </strong>
            "I have vacated the hostel and received the above refund amount in full settlement. I have cleared all my personal belongings and handed over the room keys in satisfactory condition."
          </div>

          {/* Signatures */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-xs">
            <div className="text-center space-y-1">
              <div className="border-t border-black pt-2 mx-4">
                <p className="font-bold text-black">{receipt.resident_name}</p>
                <p className="text-neutral-500 text-[10px]">Resident's Signature</p>
                <p className="text-neutral-400 text-[10px]">Date: {formatDate(receipt.checkout_date)}</p>
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="border-t border-black pt-2 mx-4">
                <p className="font-bold text-black">{receipt.issued_by}</p>
                <p className="text-neutral-500 text-[10px]">For MayThree Hostel – Authorised Signature</p>
                <p className="text-neutral-400 text-[10px]">Date: {formatDate(receipt.checkout_date)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
