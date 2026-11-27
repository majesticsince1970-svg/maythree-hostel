# UX and product review — November 2026

Review of commit `44bc682` on `main`. The app was run locally in a phone-sized browser and
every page was read in code. Each section notes whether it was clicked through or read only.

**Summary.** The screens are well thought out, and the admission and kiosk flows are close to
good. The biggest gaps are reliability (records are kept per device), money records that can't
be corrected, and phone ergonomics. The fixes in this pull request are listed first.

## Fixed in this pull request

| Problem | Fix |
| --- | --- |
| Dashboard stat icons rendered navy on navy and were invisible | Light tinted backgrounds per icon colour |
| Inputs used 14px text, so iPhones zoomed into every field; phone fields opened the full keyboard | 16px inputs on phones; number pads for phone and Aadhaar fields; selects labelled |
| Choosing the ₹13,000 AC twin room highlighted both twin cards and saved a non-AC request | Each card sets room type and AC together; the review step shows the chosen room |
| The kiosk's Exit button went straight to the staff app | Exit needs the signed-in staff member's password |
| A failed application still showed "submitted successfully" and a reference number | Success only after the save; inline error otherwise; safe retries; references no longer clash or carry a fixed year |
| Uploaded photos and ID proofs never reached the database | Files go to a private Supabase Storage bucket (migration 020); staff view them through signed links |

## Reliability first

- **Records are kept per device.** Most data lives in each browser's storage, and many writes
  to Supabase fail silently. The warden's phone, the office laptop and the kiosk tablet each
  hold different records, and clearing a browser loses them. Browser storage holds about 5 MB,
  and once full, saving stops without warning.
- **Fix:** make Supabase the single source of truth. Use React Query (already installed) for
  every read and write, let the database create ids, show errors when a save fails, and run
  each money operation as one database function so a payment and its cash entry save together.

## Journey by journey

### Applicant QR form (clicked through)
- "Beds available" is calculated on the applicant's phone from built-in data, not the real
  vacancy. The `v_public_room_options` view exists for this.
- A page refresh loses everything typed, and the step dots have no labels.

### Admission and bed allocation (clicked through)
- Works: the toast confirmation, AC rent pre-filled, deposit defaulting to 2× rent.
- Applications show "Pref: Any Room" to staff: the room type isn't loaded with the application,
  and room-type ids differ between the app (`rt-1`) and the database (UUIDs).
- The new resident's PIN is never shown at enrolment. Add a handoff screen with PIN, room,
  rent and deposit, with a WhatsApp share.
- An approved application keeps its "Allocate" button, so one person can get two beds.
- The deposit is recorded even when "advance received" is unticked, then refunded in full at
  checkout.
- The "Live Sync Active" badge is always green.

### Residents (clicked through)
- Works: search, Call and WhatsApp buttons.
- The largest button is the red "Vacate"; there is no "Collect rent", emergency contact, photo
  or history. A resident profile page would cover these.

### Rent collection (clicked through)
- Works: the amount pre-fills to the monthly rent.
- "Issue Official Receipt" only shows a toast; open the receipt and offer WhatsApp/PDF sharing.
- The resident picker is a long dropdown with no search.
- Unpaid rent disappears on the 1st (only the current month counts); overpayments are lost; a
  reprinted receipt recalculates its balance.
- No payment, expense, sale or purchase can be edited or voided. Add reversal entries with a
  reason and the real user.

### Expenses, purchases, cash book (read in code)
- Accounts start at ₹0 and expenses over the recorded balance are blocked, but the error isn't
  shown, so "Record Expense" silently does nothing on day one.
- A purchase paid from "Store Counter" never reduces that account.
- The cash book has no date filter or running balance; history shows "Staff User" instead of
  who acted.

### Store POS (looked at)
- The cart sits at the top instead of a bar fixed to the bottom; +/− buttons are about 24px;
  barcode Enter does nothing.
- Store credit can never be settled, so a resident who once bought on credit stays a defaulter.

### Entrance kiosk (clicked through)
- Works: big keypad, purpose of leaving, friendly confirmation.
- Clear the screen after a few seconds of inactivity, and don't pre-select "College / Classes".
- Movements stay on the tablet and times are stored as display text, so late-return and
  overnight-out alerts aren't possible yet.

### Checkout / vacate (read in code)
- Store dues are counted twice (as "Prior Balance" and as a deduction); unpaid rent from earlier
  months isn't counted.
- The receipt omits excess rent paid, so its figures don't add up, and is titled "TAX INVOICE"
  without a GSTIN.
- "Check Out" on the bed board frees the bed with no settlement or receipt.

### Reports and Settings (read in code)
- Profit & loss mixes cash and accrual figures, so it doesn't match the cash book; a past month
  shows today's occupancy.
- Rent changes don't apply to existing residents and aren't saved to the database.
- The full-occupancy figure ignores the AC rate (₹12,78,000 shown vs ₹13,08,000).
- "Add Staff" with an existing username overwrites that account, and nothing prevents removing
  the last admin.

## Across the app

| Area | Finding | Suggestion |
| --- | --- | --- |
| Dashboard | 3,700px tall on a phone; 11 stat cards before anything actionable | Lead with today: pending applications, dues, who is out |
| Text size | 485 uses of text 12px or smaller | 14px minimum for body text |
| Tables | Payments, expenses and checkout tables scroll sideways on phones | Card layouts on phones, as `StoreProductsPage` already does |
| Accessibility | One `aria-label` in the app; clickable `div`s; dialogs without focus handling | Buttons for actions; labels on icon buttons |
| Navigation | Old routes (`/rooms`, `/applications`) alongside tabbed pages | Redirect old routes to their tabs |
| Dates | 28 places compute "today" in UTC, wrong between midnight and 5:30 AM IST | One Asia/Kolkata date helper |
| Performance | One 1 MB JavaScript file | Lazy-load each page |
| Install | No PWA manifest | Installable app for staff phones and the kiosk tablet |
| Tooling | No tests; `npm run lint` has no ESLint config | Add the config; test the money maths first |

## Questions for the owners

- Should unpaid rent carry over month to month?
- For an admission on the 27th, is a full month's rent due, or pro-rata?
- Should an expense above the recorded balance be blocked, or only warned about?
- Does GST apply to rent or store sales?
