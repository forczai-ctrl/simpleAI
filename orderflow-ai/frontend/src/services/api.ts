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


