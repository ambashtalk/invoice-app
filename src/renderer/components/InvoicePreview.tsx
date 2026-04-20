import { numberToWords, formatIndianNumber } from '../../shared/utils/numbers-to-words'
import { calculateInvoiceTax } from '../../shared/utils/tax-calculator'
import './InvoicePreview.css'

interface LineItem {
    slNo: number
    description: string
    amount: number
    tax_rate?: number
    show_sgst_cgst?: boolean
}

interface Client {
    uuid: string
    name: string
    email: string | null
    address: string | null
    gstin: string | null
}

interface PaymentProfile {
    id: string
    beneficiary_name: string
    bank_name: string
    account_type: string
    branch: string | null
    ifsc_code: string | null
    account_number: string
    is_default: number
}

interface Signature {
    id: string
    name: string
    image_blob: string
}

interface SellerInfo {
    name: string
    address: string
    pan: string
    gstin?: string
}

interface InvoicePreviewProps {
    invoice: {
        uuid?: string
        invoice_no: string
        client_id?: string
        currency: 'INR' | 'USD' | 'EUR'
        tax_rate: number
        total_amount: number
        items: LineItem[]
        created_at?: number
        scheduled_at?: number
    }
    client?: Client | null
    paymentProfile?: PaymentProfile | null
    signature?: Signature | null
    sellerInfo?: SellerInfo
}

function formatDate(timestamp?: number): string {
    if (!timestamp) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    return new Date(timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number, currency: string): string {
    if (currency === 'INR') {
        return '₹' + formatIndianNumber(parseFloat(amount.toFixed(2)))
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
    }).format(amount)
}

export default function InvoicePreview({
    invoice,
    client,
    paymentProfile,
    signature,
    sellerInfo
}: InvoicePreviewProps) {
    const taxBreakdown = calculateInvoiceTax(invoice.items)
    const dueDate = invoice.scheduled_at
        ? new Date(invoice.scheduled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : formatDate(invoice.created_at ? invoice.created_at + 30 * 24 * 60 * 60 * 1000 : undefined)

    return (
        <div className="invoice-preview" id="invoice-preview-root">
            {/* Header */}
            <div className="invoice-header">
                <div className="seller-info">
                    <h1 className="seller-name">{sellerInfo?.name || 'Your Business Name'}</h1>
                    <p className="seller-address">{sellerInfo?.address || 'Your Address, City, State - PIN'}</p>
                    {sellerInfo?.pan && <p className="seller-pan">PAN: <strong>{sellerInfo.pan}</strong></p>}
                    {sellerInfo?.gstin && <p className="seller-pan">GSTIN: <strong>{sellerInfo.gstin}</strong></p>}
                </div>
            </div>

            {/* Bill Type Ribbon */}
            <div className="bill-type-ribbon">
                <span>BILL OF SUPPLY</span>
            </div>

            {/* Recipient + Invoice Details */}
            <div className="invoice-meta">
                <div className="recipient-section">
                    <p className="section-label">Billed To</p>
                    {client ? (
                        <>
                            <p className="recipient-name">{client.name}</p>
                            {client.address && <p className="recipient-address">{client.address}</p>}
                            {client.gstin && <p className="recipient-gstin">GSTIN: {client.gstin}</p>}
                            {client.email && <p className="recipient-email">{client.email}</p>}
                        </>
                    ) : (
                        <p className="recipient-name" style={{ opacity: 0.4 }}>No client selected</p>
                    )}
                </div>
                <div className="invoice-details-section">
                    <table className="invoice-details-table">
                        <tbody>
                            <tr>
                                <td className="detail-label">Invoice No.</td>
                                <td className="detail-value">{invoice.invoice_no}</td>
                            </tr>
                            <tr>
                                <td className="detail-label">Invoice Date</td>
                                <td className="detail-value">{formatDate(invoice.created_at)}</td>
                            </tr>
                            <tr>
                                <td className="detail-label">Due Date</td>
                                <td className="detail-value">{dueDate}</td>
                            </tr>
                            <tr>
                                <td className="detail-label">Currency</td>
                                <td className="detail-value">{invoice.currency}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Line Items */}
            <table className="line-items-table">
                <thead>
                    <tr>
                        <th className="col-sl">SI No.</th>
                        <th className="col-desc">Description of Services</th>
                        <th className="col-amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item) => (
                        <tr key={item.slNo}>
                            <td className="col-sl">{item.slNo}</td>
                            <td className="col-desc">
                                <div>{item.description}</div>
                                {item.show_sgst_cgst && item.tax_rate && item.tax_rate > 0 && (
                                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                        CGST ({(item.tax_rate * 50).toFixed(1)}%): {formatCurrency(taxBreakdown.items.find(it => it.description === item.description)?.cgstAmount || 0, invoice.currency)} | 
                                        SGST ({(item.tax_rate * 50).toFixed(1)}%): {formatCurrency(taxBreakdown.items.find(it => it.description === item.description)?.sgstAmount || 0, invoice.currency)}
                                    </div>
                                )}
                            </td>
                            <td className="col-amount">{formatCurrency(item.amount, invoice.currency)}</td>
                        </tr>
                    ))}
                    {/* Filler rows to maintain layout */}
                    {invoice.items.length < 5 && Array.from({ length: 5 - invoice.items.length }).map((_, i) => (
                        <tr key={`empty-${i}`} className="empty-row">
                            <td />
                            <td />
                            <td />
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="totals-section">
                <div className="amount-words">
                    {invoice.currency === 'INR' && (
                        <p><em>{numberToWords(invoice.total_amount)}</em></p>
                    )}
                </div>
                <div className="amounts-breakdown">
                    <div className="amount-row">
                        <span className="amount-label">Base Amount</span>
                        <span className="amount-value">{formatCurrency(taxBreakdown.baseAmount, invoice.currency)}</span>
                    </div>
                    {Object.entries(taxBreakdown.aggregateByRate).map(([rate, data]: [string, any]) => (
                        <div key={rate}>
                            {data.sgst !== undefined ? (
                                <>
                                    <div className="amount-row">
                                        <span className="amount-label">CGST ({(parseFloat(rate) * 50).toFixed(1)}%)</span>
                                        <span className="amount-value">{formatCurrency(data.cgst, invoice.currency)}</span>
                                    </div>
                                    <div className="amount-row">
                                        <span className="amount-label">SGST ({(parseFloat(rate) * 50).toFixed(1)}%)</span>
                                        <span className="amount-value">{formatCurrency(data.sgst, invoice.currency)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="amount-row">
                                    <span className="amount-label">Tax ({(parseFloat(rate) * 100).toFixed(0)}% GST)</span>
                                    <span className="amount-value">{formatCurrency(data.tax, invoice.currency)}</span>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="amount-row total-row">
                        <span className="amount-label">Total Amount</span>
                        <span className="amount-value total-value">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
                    </div>
                </div>
            </div>

            {/* Bank Details */}
            {paymentProfile && (
                <div className="bank-details">
                    <p className="bank-details-title">Bank Details</p>
                    <div className="bank-details-grid">
                        <div className="bank-row">
                            <span className="bank-label">Beneficiary Name</span>
                            <span className="bank-value">{paymentProfile.beneficiary_name}</span>
                        </div>
                        <div className="bank-row">
                            <span className="bank-label">Bank</span>
                            <span className="bank-value">{paymentProfile.bank_name}</span>
                        </div>
                        <div className="bank-row">
                            <span className="bank-label">Account Type</span>
                            <span className="bank-value">{paymentProfile.account_type}</span>
                        </div>
                        {paymentProfile.branch && (
                            <div className="bank-row">
                                <span className="bank-label">Branch</span>
                                <span className="bank-value">{paymentProfile.branch}</span>
                            </div>
                        )}
                        <div className="bank-row">
                            <span className="bank-label">Account Number</span>
                            <span className="bank-value mono">{paymentProfile.account_number}</span>
                        </div>
                        {paymentProfile.ifsc_code && (
                            <div className="bank-row">
                                <span className="bank-label">IFSC Code</span>
                                <span className="bank-value mono">{paymentProfile.ifsc_code}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Signature Footer */}
            <div className="invoice-footer">
                <div className="signature-block">
                    {signature ? (
                        <img
                            src={`data:image/png;base64,${signature.image_blob}`}
                            alt="Authorised Signature"
                            className="signature-image"
                        />
                    ) : (
                        <div className="signature-placeholder" />
                    )}
                    <div className="signature-label">Authorised Signatory</div>
                    {sellerInfo?.name && (
                        <div className="signature-company">{sellerInfo.name}</div>
                    )}
                </div>
            </div>
        </div>
    )
}
