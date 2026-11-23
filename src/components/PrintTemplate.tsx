import React from 'react'
import { BRAND } from '@/lib/brandConfig'
import { MythreeLogo } from '@/components/MythreeLogo'

export interface PrintTemplateProps {
  documentTitle: string
  referenceNo?: string
  date?: string
  guestDetails?: {
    name?: string
    phone?: string
    roomBed?: string
    admissionDate?: string
    checkoutDate?: string
    duration?: string
  }
  children: React.ReactNode
  showSignatures?: boolean
  signatoryName?: string
  declarationText?: string
  termsNote?: string
}

export function PrintTemplate({
  documentTitle,
  referenceNo,
  date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  guestDetails,
  children,
  showSignatures = true,
  signatoryName = 'Staff Incharge',
  declarationText = 'All dues settled. Room vacated and keys returned in good order.',
  termsNote,
}: PrintTemplateProps) {
  return (
    <div className="printable-document bg-white text-black p-6 sm:p-8 font-sans max-w-[210mm] mx-auto">
      {/* ── 1. OFFICIAL INSTITUTIONAL HEADER ── */}
      <div className="border-b-2 border-[#10375C] pb-4 mb-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <MythreeLogo variant="icon" size="lg" color="#10375C" />
            <div>
              <h1 className="text-2xl font-black tracking-wide text-[#10375C] uppercase leading-none">
                MYTHREE
              </h1>
              <p className="text-xs font-bold tracking-[0.25em] text-[#10375C]/90 uppercase mt-0.5">
                LADIES HOSTEL
              </p>
              <p className="text-[10px] text-neutral-600 font-medium tracking-wide mt-1">
                {BRAND.roomTypesSummary}
              </p>
            </div>
          </div>

          {/* Institutional Contact Info */}
          <div className="text-right text-[11px] text-neutral-800 space-y-0.5">
            <p className="font-semibold text-neutral-900">{BRAND.address.full}</p>
            <p className="font-mono text-neutral-800">
              <span className="font-semibold">Tel:</span> {BRAND.contacts.phoneFormatted}
            </p>
            <p className="text-[10px] text-neutral-600">
              <span className="font-semibold">Web:</span> {BRAND.contacts.website} ·{' '}
              <span className="font-semibold">Email:</span> {BRAND.contacts.email}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. DOCUMENT TITLE & METADATA BAR ── */}
      <div className="bg-[#10375C]/5 border border-[#10375C]/20 rounded-md p-3 mb-5 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold uppercase tracking-wider text-[#10375C]">
            {documentTitle}
          </h2>
          <p className="text-[10px] text-neutral-600">
            Official System Record · Mythree Ladies Hostel
          </p>
        </div>
        <div className="text-right text-xs">
          {referenceNo && (
            <p className="font-mono font-bold text-neutral-900">
              <span className="text-neutral-500 font-sans font-normal text-[11px]">Ref / Voucher:</span>{' '}
              {referenceNo}
            </p>
          )}
          <p className="text-[11px] text-neutral-600 font-medium">
            <span className="text-neutral-500">Date:</span> {date}
          </p>
        </div>
      </div>

      {/* ── 3. GUEST / RESIDENT DETAILS (OPTIONAL) ── */}
      {guestDetails && (
        <div className="border border-neutral-300 rounded-md p-3 mb-5 text-xs bg-neutral-50/50 print-avoid-break">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {guestDetails.name && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Resident / Guest Name</span>
                <span className="font-bold text-neutral-900 text-sm">{guestDetails.name}</span>
              </div>
            )}
            {guestDetails.roomBed && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Room & Bed</span>
                <span className="font-semibold font-mono text-neutral-900">{guestDetails.roomBed}</span>
              </div>
            )}
            {guestDetails.phone && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Phone</span>
                <span className="font-mono text-neutral-800">{guestDetails.phone}</span>
              </div>
            )}
            {guestDetails.admissionDate && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Admission Date</span>
                <span className="text-neutral-800">{guestDetails.admissionDate}</span>
              </div>
            )}
            {guestDetails.checkoutDate && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Checkout Date</span>
                <span className="text-neutral-800 font-semibold">{guestDetails.checkoutDate}</span>
              </div>
            )}
            {guestDetails.duration && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Duration of Stay</span>
                <span className="text-neutral-800 font-medium">{guestDetails.duration}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. DOCUMENT BODY / ITEMIZED CONTENT ── */}
      <div className="space-y-4 mb-6">{children}</div>

      {/* ── 5. DECLARATION & TERMS ── */}
      <div className="print-avoid-break space-y-3 pt-2">
        {declarationText && (
          <div className="p-2.5 bg-neutral-100 rounded border border-neutral-300 text-[11px] text-neutral-800 italic">
            <span className="font-semibold not-italic">Declaration: </span>
            {declarationText}
          </div>
        )}

        {termsNote && (
          <p className="text-[10px] text-neutral-500 leading-tight">
            * {termsNote}
          </p>
        )}

        {/* ── 6. DUAL SIGNATURE BOXES ── */}
        {showSignatures && (
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-neutral-300 text-xs">
            <div className="text-center space-y-1">
              <div className="border-b border-black w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-neutral-900">Resident / Guest Signature</p>
              <p className="text-[10px] text-neutral-500">I confirm the above settlement & keys returned</p>
            </div>
            <div className="text-center space-y-1">
              <div className="border-b border-black w-48 mx-auto h-8 mb-2" />
              <p className="font-bold text-neutral-900">Authorised Signatory</p>
              <p className="text-[10px] text-neutral-700 font-semibold">{signatoryName}</p>
              <p className="text-[9px] text-neutral-500">For Mythree Ladies Hostel</p>
            </div>
          </div>
        )}

        {/* ── 7. SYSTEM AUDIT FOOTER ── */}
        <div className="border-t border-neutral-200 pt-3 mt-4 flex items-center justify-between text-[9px] text-neutral-500 font-mono">
          <span>Official Document · {BRAND.name}</span>
          <span>Printed on {new Date().toLocaleString('en-IN')}</span>
          <span>{BRAND.contacts.website}</span>
        </div>
      </div>
    </div>
  )
}

