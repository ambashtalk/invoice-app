import { BrowserWindow } from 'electron'
import { join } from 'path'

/**
 * PDF Generation using Electron's webContents.printToPDF
 * Renders the invoice in a hidden window and exports to PDF bytes
 */

let pdfWindow: BrowserWindow | null = null
let isGeneratingPdf = false // Simple mutex

function getPdfWindow(): BrowserWindow {
  if (pdfWindow && !pdfWindow.isDestroyed()) {
    return pdfWindow
  }

  pdfWindow = new BrowserWindow({
    width: 900,
    height: 1200,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  pdfWindow.on('closed', () => {
    pdfWindow = null
  })

  return pdfWindow
}

export async function generateInvoicePDF(invoiceData: {
  uuid: string
  invoice_no: string
  items: any[]
  currency: string
  total_amount: number
  tax_rate: number
  created_at?: number
  scheduled_at?: number
  client?: any
  paymentProfile?: any
  signature?: any
  sellerInfo?: any
}): Promise<Buffer> {
  // Simple check for concurrent access
  while (isGeneratingPdf) {
    console.log(`PDF: Waiting for previous generation to finish...`);
    await new Promise(r => setTimeout(r, 1000));
  }
  isGeneratingPdf = true;

  console.log(`PDF: Starting generation for ${invoiceData.invoice_no}`);
  const win = getPdfWindow()
  const html = buildInvoiceHTML(invoiceData)

  return new Promise((resolve, reject) => {
    let completed = false;
    const timeout = setTimeout(() => {
      if (completed) return;
      cleanup();
      reject(new Error('PDF generation timed out after 30s'));
    }, 30000);

    const handleFinishLoad = async () => {
      console.log(`PDF: did-finish-load received for ${invoiceData.invoice_no}`);
      if (completed) return;
      try {
        // small extra wait for fonts/images to be sure
        await new Promise(r => setTimeout(r, 500))
        
        console.log(`PDF: Printing to PDF...`);
        const pdfData = await win.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: {
            marginType: 'custom',
            top: 0.4,
            bottom: 0.4,
            left: 0.4,
            right: 0.4
          }
        })
        console.log(`PDF: Print successful for ${invoiceData.invoice_no}`);
        completed = true;
        resolve(Buffer.from(pdfData))
      } catch (err) {
        reject(err)
      } finally {
        cleanup()
      }
    }

    const handleFailLoad = (_: any, errorCode: number, errorDescription: string) => {
      console.error(`PDF: did-fail-load: ${errorDescription} (${errorCode})`);
      if (completed) return;
      completed = true;
      reject(new Error(`Failed to load PDF content: ${errorDescription} (${errorCode})`))
      cleanup()
    }

    const cleanup = () => {
      clearTimeout(timeout);
      win.webContents.removeListener('did-finish-load', handleFinishLoad)
      win.webContents.removeListener('did-fail-load', handleFailLoad)
      isGeneratingPdf = false;
    }

    win.webContents.once('did-finish-load', handleFinishLoad)
    win.webContents.once('did-fail-load', handleFailLoad)

    // Load the HTML directly
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(err => {
      cleanup()
      reject(err)
    })
  })
}

function buildInvoiceHTML(data: any): string {
  const formatAmount = (amount: number): string => {
    if (data.currency === 'INR') return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `${data.currency} ${amount.toFixed(2)}`
  }

  const base = data.total_amount / (1 + data.tax_rate)
  const tax = data.total_amount - base

  const lineItemsRows = data.items.map((item: any) => `
        <tr>
            <td style="text-align:center;border-bottom:1px solid #e2e8f0;padding:12px 10px;">${item.slNo}</td>
            <td style="border-bottom:1px solid #e2e8f0;padding:12px 10px;">${item.description}</td>
            <td style="text-align:right;border-bottom:1px solid #e2e8f0;padding:12px 10px;">${formatAmount(item.amount)}</td>
        </tr>
    `).join('')

  // Placeholder rows if needed to fill space
  const fillerRows = data.items.length < 5 ? 
    Array.from({ length: 5 - data.items.length }).map(() => `
        <tr style="height:40px;">
            <td style="border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-bottom:1px solid #e2e8f0;"></td>
            <td style="border-bottom:1px solid #e2e8f0;"></td>
        </tr>
    `).join('') : ''

  const sellerName = data.sellerInfo?.name || 'Your Business Name'
  const sellerAddress = data.sellerInfo?.address || ''
  const sellerPAN = data.sellerInfo?.pan || ''
  const sellerGSTIN = data.sellerInfo?.gstin || ''

  const dueDateObj = data.scheduled_at 
    ? new Date(data.scheduled_at) 
    : new Date((data.created_at || Date.now()) + 30 * 24 * 60 * 60 * 1000)
  const dueDateStr = dueDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const invoiceDateStr = new Date(data.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const clientBlock = data.client ? `
        <div>
            <strong style="font-size:14px;color:#0f172a;">${data.client.name}</strong><br>
            <div style="margin-top:4px;line-height:1.4;color:#475569;">
                ${data.client.address || ''}<br>
                ${data.client.gstin ? `GSTIN: ${data.client.gstin}` : ''}
            </div>
        </div>
    ` : '<div style="color:#999">No client</div>'

  const bankGrid = data.paymentProfile ? `
        <div class="bank-grid">
            <div class="bank-col">
                <div class="bank-item">
                    <div class="bank-label">Beneficiary Name</div>
                    <div class="bank-value">${data.paymentProfile.beneficiary_name}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">Bank</div>
                    <div class="bank-value">${data.paymentProfile.bank_name}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">Account Type</div>
                    <div class="bank-value">${data.paymentProfile.account_type || 'Savings Account'}</div>
                </div>
            </div>
            <div class="bank-col">
                <div class="bank-item">
                    <div class="bank-label">Account Number</div>
                    <div class="bank-value" style="font-family:monospace;">${data.paymentProfile.account_number}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">IFSC Code</div>
                    <div class="bank-value" style="font-family:monospace;">${data.paymentProfile.ifsc_code}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">Branch</div>
                    <div class="bank-value">${data.paymentProfile.branch || 'N/A'}</div>
                </div>
            </div>
        </div>
    ` : ''

  const signatureBlock = data.signature
    ? `<img src="data:image/png;base64,${data.signature.image_blob}" style="max-height:70px;display:block;margin-bottom:8px;" />`
    : '<div style="height:70px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;"></div>'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 11px; color: #1e293b; background: white; padding: 40px; line-height: 1.5; }
  h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.5px; }
  .ribbon { background: #0f172a; color: white; text-align: center; padding: 10px; font-size: 12px; font-weight: 800; letter-spacing: 4px; margin: 25px 0; border-radius: 4px; }
  .two-col { display: flex; justify-content: space-between; margin: 30px 0; gap: 40px; }
  table.items { width: 100%; border-collapse: collapse; margin: 20px 0; }
  table.items th { background: #f8fafc; border-bottom: 2px solid #0f172a; color: #0f172a; padding: 12px 10px; text-align: left; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
  table.items td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  .totals-section { display: flex; justify-content: space-between; margin-top: 30px; gap: 40px; }
  .amount-words { flex: 1; font-style: italic; color: #64748b; font-size: 11px; }
  .amounts-breakdown { min-width: 250px; }
  .total-row { font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; }
  .amount-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
  .amount-label { color: #64748b; }
  .amount-value { font-weight: 600; color: #1e293b; }
  .bank { border: 1px solid #e2e8f0; border-left: 4px solid #0f172a; padding: 20px; margin-top: 50px; border-radius: 8px; background: #fcfdfe; }
  .bank-title { font-weight: 800; margin-bottom: 15px; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; }
  .bank-grid { display: flex; gap: 40px; }
  .bank-col { flex: 1; }
  .bank-item { display: flex; margin-bottom: 8px; align-items: flex-start; }
  .bank-label { width: 100px; color: #64748b; font-size: 10px; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.5px; }
  .bank-value { color: #0f172a; font-weight: 600; font-size: 11px; }
  .footer { display: flex; justify-content: flex-end; margin-top: 80px; }
  .sig-block { text-align: center; min-width: 220px; }
</style>
</head>
<body>
  <div style="text-align:left; margin-bottom:20px;">
    <h1>${sellerName}</h1>
    <div style="color:#475569;font-size:11px;margin-top:4px;max-width:400px;line-height:1.5;">${sellerAddress}</div>
    <div style="display:flex;gap:15px;margin-top:8px;">
        ${sellerPAN ? `<div><span style="color:#64748b;font-size:10px;text-transform:uppercase;">PAN:</span> <b style="font-size:11px;">${sellerPAN}</b></div>` : ''}
        ${sellerGSTIN ? `<div><span style="color:#64748b;font-size:10px;text-transform:uppercase;">GSTIN:</span> <b style="font-size:11px;">${sellerGSTIN}</b></div>` : ''}
    </div>
  </div>
  
  <div class="ribbon">BILL OF SUPPLY</div>
  
  <div class="two-col">
    <div style="flex:1">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px;font-weight:700;">Billed To</div>
      ${clientBlock}
    </div>
    <div style="min-width:200px;">
      <table style="width:100%; border-spacing: 0 4px;">
        <tr><td style="text-align:right;color:#64748b;font-size:10px;text-transform:uppercase;padding:2px 8px;">Invoice No.</td><td style="font-weight:700;color:#0f172a;text-align:right;">${data.invoice_no}</td></tr>
        <tr><td style="text-align:right;color:#64748b;font-size:10px;text-transform:uppercase;padding:2px 8px;">Invoice Date</td><td style="font-weight:600;text-align:right;">${invoiceDateStr}</td></tr>
        <tr><td style="text-align:right;color:#64748b;font-size:10px;text-transform:uppercase;padding:2px 8px;">Due Date</td><td style="font-weight:600;text-align:right;">${dueDateStr}</td></tr>
        <tr><td style="text-align:right;color:#64748b;font-size:10px;text-transform:uppercase;padding:2px 8px;">Currency</td><td style="font-weight:600;text-align:right;">${data.currency}</td></tr>
      </table>
    </div>
  </div>
  
  <table class="items">
    <thead>
      <tr>
        <th style="width:60px;text-align:center;">SI No.</th>
        <th>Description of Services</th>
        <th style="text-align:right;width:150px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsRows}
      ${fillerRows}
    </tbody>
  </table>
  
  <div class="totals-section">
    <div class="amount-words">
      ${data.currency === 'INR' ? `<div><span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;font-style:normal;font-weight:700;">Amount in words</span>${numberToWordsSimple(Math.round(data.total_amount))}</div>` : ''}
    </div>
    <div class="amounts-breakdown">
      <div class="amount-row">
        <span class="amount-label">Base Amount</span>
        <span class="amount-value">${formatAmount(base)}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Tax (${(data.tax_rate * 100).toFixed(0)}% GST)</span>
        <span class="amount-value">${formatAmount(tax)}</span>
      </div>
      <div class="total-row">
        <span>Total Amount</span>
        <span>${formatAmount(data.total_amount)}</span>
      </div>
    </div>
  </div>
  
  ${data.paymentProfile ? `<div class="bank"><div class="bank-title">Bank Details</div>${bankGrid}</div>` : ''}
  
  <div class="footer">
    <div class="sig-block">
      ${signatureBlock}
      <div style="font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:1px;">Authorised Signatory</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${sellerName}</div>
    </div>
  </div>
</body>
</html>`
}

// Simple inline number to words for PDF context (no module imports)
function numberToWordsSimple(n: number): string {
  if (n === 0) return 'Rupees Zero Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function two(n: number): string {
    if (n < 20) return ones[n]
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  }
  function three(n: number): string {
    return n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n)
  }

  let w = ''
  if (Math.floor(n / 10000000)) w += three(Math.floor(n / 10000000)) + ' Crore '
  if (Math.floor((n % 10000000) / 100000)) w += two(Math.floor((n % 10000000) / 100000)) + ' Lakh '
  if (Math.floor((n % 100000) / 1000)) w += two(Math.floor((n % 100000) / 1000)) + ' Thousand '
  if (n % 1000) w += three(n % 1000)
  return 'Rupees ' + w.trim() + ' Only'
}
