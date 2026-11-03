import { BRAND } from './brandConfig'

/**
 * Isolated A4 Document Printing Utility
 * Opens a dedicated hidden iframe with standard A4 page dimensions (@page { size: A4 portrait; margin: 12mm 15mm; })
 * and prints strictly the isolated document content, preventing any navigation chrome,
 * tables, buttons, modals, or background screens from leaking into the printout.
 */
export function printIsolatedReceipt(contentHtml: string, documentTitle = 'Official Receipt'): void {
  // Check if an existing print frame exists and remove it
  const existingFrame = document.getElementById('mythree-isolated-print-frame')
  if (existingFrame) {
    existingFrame.remove()
  }

  // Create an invisible iframe
  const iframe = document.createElement('iframe')
  iframe.id = 'mythree-isolated-print-frame'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.zIndex = '-9999'
  iframe.setAttribute('aria-hidden', 'true')

  document.body.appendChild(iframe)

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument
  if (!frameDoc) {
    console.error('Could not access iframe document for printing')
    window.print()
    return
  }

  const printDocumentHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle} - ${BRAND.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #111827;
      background: #ffffff;
      width: 100%;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-container {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 6px 10px;
    }
    th {
      background-color: #f3f4f6 !important;
      font-weight: 700;
      text-align: left;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .text-sm { font-size: 10pt; }
    .text-xs { font-size: 8.5pt; }
    .text-muted { color: #6b7280; }
    .brand-color { color: #10375C; }
    .brand-bg { background-color: #10375C !important; color: #ffffff !important; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      font-size: 8pt;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      font-weight: 600;
    }
    .header-box {
      border-bottom: 2px solid #10375C;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .footer-box {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #9ca3af;
    }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <div class="print-container">
    ${contentHtml}
  </div>
</body>
</html>
  `

  frameDoc.open()
  frameDoc.write(printDocumentHtml)
  frameDoc.close()

  // Wait for images/styles to be ready before calling print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.warn('Iframe print error:', e)
      window.print()
    } finally {
      // Remove iframe after print dialog closes
      setTimeout(() => {
        iframe.remove()
      }, 2000)
    }
  }, 350)
}
