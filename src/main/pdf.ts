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
    if (data.currency === 'INR') return `₹${amount.toFixed(2)}`
    return `${data.currency} ${amount.toFixed(2)}`
  }

  const base = data.total_amount / (1 + data.tax_rate)
  const tax = data.total_amount - base

  const lineItemsRows = data.items.map((item: any) => `
        <tr>
            <td style="text-align:center;border:1px solid #ddd;padding:8px;">${item.slNo}</td>
            <td style="border:1px solid #ddd;padding:8px;">${item.description}</td>
            <td style="text-align:right;border:1px solid #ddd;padding:8px;">${formatAmount(item.amount)}</td>
        </tr>
    `).join('')

  const sellerName = data.sellerInfo?.name || 'Your Business Name'
  const sellerAddress = data.sellerInfo?.address || ''
  const sellerPAN = data.sellerInfo?.pan || ''

  const clientBlock = data.client ? `
        <div>
            <strong>${data.client.name}</strong><br>
            ${data.client.address || ''}<br>
            ${data.client.gstin ? `GSTIN: ${data.client.gstin}` : ''}
        </div>
    ` : '<div style="color:#999">No client</div>'

  const bankBlock = data.paymentProfile ? `
        <div class="bank-grid">
            <div class="bank-col">
                <div class="bank-item">
                    <div class="bank-label">Beneficiary Name</div>
                    <div class="bank-value">${data.paymentProfile.beneficiary_name}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">Account Type</div>
                    <div class="bank-value">${data.paymentProfile.account_type || 'Savings Account'}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">Account Number</div>
                    <div class="bank-value">${data.paymentProfile.account_number}</div>
                </div>
            </div>
            <div class="bank-col">
                <div class="bank-item">
                    <div class="bank-label">Bank</div>
                    <div class="bank-value">${data.paymentProfile.bank_name}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">Branch</div>
                    <div class="bank-value">${data.paymentProfile.branch || 'N/A'}</div>
                </div>
                <div class="bank-item">
                    <div class="bank-label">IFSC Code</div>
                    <div class="bank-value">${data.paymentProfile.ifsc_code}</div>
                </div>
            </div>
        </div>
    ` : ''

  const signatureBlock = data.signature
    ? `<img src="data:image/png;base64,${data.signature.image_blob}" style="max-height:60px;display:block;margin-bottom:4px;" />`
    : '<div style="height:60px;border-bottom:1px solid #333;margin-bottom:4px;"></div>'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 12px; color: #1e293b; background: white; padding: 40px; }
  h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
  .ribbon { background: #0f172a; color: white; text-align: center; padding: 12px; font-size: 13px; font-weight: 800; letter-spacing: 4px; margin: 30px 0; border-radius: 2px; }
  .two-col { display: flex; justify-content: space-between; margin: 30px 0; }
  table.items { width: 100%; border-collapse: collapse; margin: 25px 0; }
  table.items th { background: #f8fafc; border-bottom: 2px solid #0f172a; color: #0f172a; padding: 12px 10px; text-align: left; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
  table.items td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; }
  .totals { text-align: right; margin: 20px 0; font-size: 13px; }
  .total-row { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 12px; }
  .bank { border: 1px solid #e2e8f0; border-left: 4px solid #0f172a; padding: 20px; margin-top: 40px; border-radius: 2px; background: #fff; }
  .bank-title { font-weight: 800; margin-bottom: 20px; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; }
  .bank-grid { display: flex; gap: 50px; }
  .bank-col { flex: 1; }
  .bank-item { display: flex; margin-bottom: 12px; align-items: flex-start; }
  .bank-label { width: 110px; color: #64748b; font-size: 11px; flex-shrink: 0; }
  .bank-value { color: #1e293b; font-weight: 700; font-size: 11px; line-height: 1.3; }
  .footer { display: flex; justify-content: flex-end; margin-top: 60px; }
  .sig-block { text-align: center; min-width: 200px; }
  .amount-words { font-style: italic; color: #64748b; margin-bottom: 20px; font-size: 11px; text-align: right; }
</style>
</head>
<body>
  <div style="text-align:left; margin-bottom:16px;">
    <h1>${sellerName}</h1>
    <div style="color:#555;font-size:11px;margin-top:4px;">${sellerAddress}</div>
    ${sellerPAN ? `<div style="font-size:11px;margin-top:2px;">PAN: <b>${sellerPAN}</b></div>` : ''}
  </div>
  
  <div class="ribbon">BILL OF SUPPLY</div>
  
  <div class="two-col">
    <div style="max-width:50%">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;">Billed To</div>
      ${clientBlock}
    </div>
    <div style="text-align:right">
      <table style="font-size:12px;">
        <tr><td style="text-align:right;color:#888;padding:3px 8px;">Invoice No.</td><td style="font-weight:700;">${data.invoice_no}</td></tr>
        <tr><td style="text-align:right;color:#888;padding:3px 8px;">Date</td><td>${new Date().toLocaleDateString('en-IN')}</td></tr>
        <tr><td style="text-align:right;color:#888;padding:3px 8px;">Currency</td><td>${data.currency}</td></tr>
      </table>
    </div>
  </div>
  
  <table class="items">
    <thead>
      <tr>
        <th style="width:50px;">SI No.</th>
        <th>Description</th>
        <th style="text-align:right;width:150px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsRows}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="amount-words">${data.currency === 'INR' ? numberToWordsSimple(Math.round(data.total_amount)) : ''}</div>
    <div>Base Amount: ${formatAmount(base)}</div>
    <div>Tax (${(data.tax_rate * 100).toFixed(0)}% GST): ${formatAmount(tax)}</div>
    <div class="total-row">Total: ${formatAmount(data.total_amount)}</div>
  </div>
  
  ${data.paymentProfile ? `<div class="bank"><div class="bank-title">Bank Details</div>${bankBlock}</div>` : ''}
  
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
