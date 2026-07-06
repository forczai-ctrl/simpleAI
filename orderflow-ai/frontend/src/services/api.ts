import type {
  CollectionReminder,
  DashboardResponse,
  Payment,
  PipelineRun,
  ReconciliationResult,
  UseCase,
  Invoice,
  InventoryItem,
  Vendor,
  ExceptionItem,
  ErpSyncLog,
  FulfillmentTask,
} from '../types'

// In development, Vite proxy handles forwarding to backend (empty string = relative path)
// In production (Render), use the VITE_API_BASE_URL env var pointing to the backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const sampleRawOrder = `Purchase Order PO-2001
Customer: Northstar Market
Ship To Region: TX
Delivery Date: 2026-07-05
Payment Terms: NET 30
Item SKU-COFFEE-12 Qty 6 Price 48.00
Item SKU-TEA-24 Qty 8 Price 36.00`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export function getDashboard() {
  return request<DashboardResponse>('/api/dashboard')
}

export function getUseCases() {
  return request<UseCase[]>('/api/use-cases')
}

export function runPipeline(rawText: string) {
  return request<PipelineRun>('/api/pipeline/run', {
    method: 'POST',
    body: JSON.stringify({ raw_text: rawText, channel: 'email' }),
  })
}

export function reconcilePayment(payment: Payment) {
  return request<ReconciliationResult>('/api/payment/reconcile', {
    method: 'POST',
    body: JSON.stringify(payment),
  })
}

export function generateReminder(invoice: Invoice) {
  return request<CollectionReminder>('/api/collections/remind', {
    method: 'POST',
    body: JSON.stringify({
      invoice_no: invoice.invoice_no,
      customer_name: invoice.customer_name,
      amount_due: invoice.total,
      days_overdue: invoice.invoice_no === 'INV-1002' ? 8 : 15,
      contact_name: 'Accounts Payable',
    }),
  })
}

export function parseEmailForUseCases(emailText: string) {
  return request<{ status: string; use_cases_found: number; use_cases: Array<{ id: string; name: string; phase: string; status: string }> }>('/api/email/parse', {
    method: 'POST',
    body: JSON.stringify({ raw_text: emailText, channel: 'email' }),
  })
}

export function getInventory() {
  return request<InventoryItem[]>('/api/inventory')
}

export function replenishInventory(sku: string, quantity: number) {
  return request<{ status: string; sku: string; new_qty: number }>('/api/inventory/replenish', {
    method: 'POST',
    body: JSON.stringify({ sku, quantity }),
  })
}

export function getVendors() {
  return request<Vendor[]>('/api/vendors')
}

export function procureVendor(vendorId: string) {
  return request<{ status: string; vendor_id: string; active_pos: number }>('/api/vendors/procure', {
    method: 'POST',
    body: JSON.stringify({ vendor_id: vendorId }),
  })
}

export function getExceptions() {
  return request<ExceptionItem[]>('/api/exceptions')
}

export function resolveException(exceptionId: string) {
  return request<{ status: string; exception_id: string; state: string }>('/api/exceptions/resolve', {
    method: 'POST',
    body: JSON.stringify({ exception_id: exceptionId }),
  })
}

export function syncGmailOrders() {
  return request<{ status: string; count: number; message: string }>('/api/gmail/sync-orders', {
    method: 'POST',
  })
}

export function getErpLogs() {
  return request<ErpSyncLog[]>('/api/erp/logs')
}

export function syncToErp(type: 'order' | 'invoice' | 'payment', poNumber: string, customerName: string, payload: any) {
  return request<{ status: string; message: string }>('/api/erp/sync', {
    method: 'POST',
    body: JSON.stringify({ type, po_number: poNumber, customer_name: customerName, payload }),
  })
}

export async function uploadOrderFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`${API_BASE_URL}/api/orders/upload`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  
  return (await response.json()) as any // returns OrderPayload
}

export async function uploadPipelineFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`${API_BASE_URL}/api/pipeline/upload`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  
  return (await response.json()) as PipelineRun
}

export function getSettings() {
  return request<any>('/api/settings')
}

export function saveSettings(settings: any) {
  return request<{ status: string; message: string }>('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

export function addVendor(vendor: Vendor) {
  return request<Vendor>('/api/vendors', {
    method: 'POST',
    body: JSON.stringify(vendor),
  })
}

export function updateFulfillment(task: FulfillmentTask) {
  return request<{ status: string; message: string }>('/api/fulfillment/update', {
    method: 'POST',
    body: JSON.stringify(task),
  })
}

export function optimizeFulfillment() {
  return request<{ status: string; message: string }>('/api/fulfillment/optimize', {
    method: 'POST',
  })
}

export function retryPayment(paymentId: string) {
  return request<{ status: string; message: string }>('/api/payment/retry', {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId }),
  })
}

export function refundPayment(paymentId: string) {
  return request<{ status: string; message: string }>('/api/payment/refund', {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId }),
  })
}

export function closePeriod() {
  return request<{ status: string; message: string }>('/api/payment/close-period', {
    method: 'POST',
  })
}

export function disputeInvoice(invoiceNo: string, disputed: boolean) {
  return request<{ status: string; message: string; actions?: string[] }>('/api/invoice/dispute', {
    method: 'POST',
    body: JSON.stringify({ invoice_no: invoiceNo, disputed }),
  })
}

export function getRevenueRecognition() {
  return request<Array<{ name: string; contract: number; recognized: number; deferred: number }>>('/api/reports/revenue-recognition')
}

// ─── Zoho ERP ("ALO" System) API Functions ──────────────────────────────

export function getZohoErpStatus() {
  return request<{
    erp_system: string
    connected: boolean
    organization_id: string
    region: string
    has_client_id: boolean
    has_refresh_token: boolean
  }>('/api/erp/zoho/status')
}

export function testZohoErpConnection() {
  return request<{
    connected: boolean
    message: string
    organization?: string
    org_id?: string
    region?: string
  }>('/api/erp/zoho/test', {
    method: 'POST',
  })
}

export function syncOrderToZoho(payload: any) {
  return request<{
    status: string
    zoho_id?: string
    zoho_number?: string
    message: string
  }>('/api/erp/zoho/sync-order', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  })
}

export function syncInvoiceToZoho(payload: any) {
  return request<{
    status: string
    zoho_id?: string
    zoho_number?: string
    message: string
  }>('/api/erp/zoho/sync-invoice', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  })
}

export function lookupZohoInventory(sku: string) {
  return request<{
    status: string
    sku?: string
    name?: string
    available_qty: number
    actual_available_qty?: number
    unit?: string
    message?: string
  }>(`/api/erp/zoho/inventory/${encodeURIComponent(sku)}`)
}

export function findOrCreateZohoCustomer(customerName: string, email: string = '') {
  return request<{
    status: string
    contact_id?: string
    contact_name?: string
    message?: string
  }>('/api/erp/zoho/customer', {
    method: 'POST',
    body: JSON.stringify({ customer_name: customerName, email }),
  })
}

// ─── Email Notification API Functions ───────────────────────────────────

export function sendOrderAckEmail(data: {
  customer_email: string
  customer_name: string
  po_number: string
  items: Array<{ sku: string; description: string; quantity: number; unit_price: number }>
  delivery_date: string
  payment_terms: string
  total_amount: number
}) {
  return request<{ status: string; message: string; subject?: string }>('/api/email/send-order-ack', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function sendInvoiceEmail(data: {
  customer_email: string
  customer_name: string
  invoice_no: string
  po_number: string
  invoice_date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  lines: Array<{ sku: string; description: string; quantity: number; unit_price: number; amount: number }>
}) {
  return request<{ status: string; message: string; subject?: string }>('/api/email/send-invoice', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function sendFulfillmentUpdateEmail(data: {
  customer_email: string
  customer_name: string
  po_number: string
  stage: string
  owner: string
  committed_date: string
  risk: string
  optimized_route: string
}) {
  return request<{ status: string; message: string; subject?: string }>('/api/email/send-fulfillment-update', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function sendOrderRegistryEmail(data: {
  customer_email: string
  customer_name: string
  po_number: string
  status: string
  total_amount: number
  item_count: number
}) {
  return request<{ status: string; message: string; subject?: string }>('/api/email/send-order-registry', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function sendUseCaseReportEmail(to_email: string, report_format: string = 'csv') {
  return request<{ status: string; message: string; subject?: string }>('/api/email/send-use-case-report', {
    method: 'POST',
    body: JSON.stringify({ to_email, report_format }),
  })
}

export function downloadUseCaseCoverage(report_format: string = 'csv') {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
  const url = `${API_BASE_URL}/api/reports/use-case-coverage/download?report_format=${report_format}`
  window.open(url, '_blank')
}



