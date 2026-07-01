export type MetricTone = 'good' | 'warning' | 'critical' | 'neutral'
export type OrderStatus = 'received' | 'extracted' | 'validated' | 'scheduled' | 'fulfilled' | 'invoiced' | 'paid' | 'exception'
export type CheckStatus = 'pass' | 'warning' | 'fail'

export interface OrderItem {
  sku: string
  description: string
  quantity: number
  unit_price: number
  line_total?: number
}

export interface Order {
  customer_name: string
  po_number: string
  items: OrderItem[]
  delivery_date: string
  payment_terms: string
  channel: string
  ship_to_region: string
  customer_tier: string
  credit_limit: number
  current_balance: number
  status: OrderStatus
  total_amount?: number
}

export interface ValidationCheck {
  name: string
  status: CheckStatus
  detail: string
}

export interface PriorityResult {
  score: number
  tier_weight: number
  revenue_weight: number
  deadline_weight: number
  complexity_weight: number
  rationale: string[]
}

export interface ValidationResult {
  order: Order
  checks: ValidationCheck[]
  approved: boolean
  exceptions: string[]
  priority: PriorityResult
}

export interface Acknowledgement {
  to_customer: string
  subject: string
  body: string
  next_step: string
}

export interface FulfillmentTask {
  order_id: string
  po_number: string
  customer_name: string
  stage: 'pending' | 'in_progress' | 'blocked' | 'completed'
  owner: string
  committed_date: string
  risk: 'low' | 'medium' | 'high'
}

export interface InvoiceLine {
  sku: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface Invoice {
  invoice_no: string
  po_number: string
  customer_name: string
  invoice_date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'validated' | 'sent' | 'paid' | 'overdue'
  lines: InvoiceLine[]
}

export interface InvoiceValidationResult {
  invoice: Invoice
  checks: ValidationCheck[]
  approved: boolean
}

export interface Payment {
  payment_id: string
  customer_name: string
  amount: number
  received_date: string
  reference?: string
}

export interface ReconciliationResult {
  payment: Payment
  matched_invoice_no: string | null
  confidence: number
  status: 'matched' | 'partial' | 'unmatched'
  notes: string[]
}

export interface CollectionReminder {
  invoice_no: string
  tone: 'friendly' | 'firm' | 'escalation'
  subject: string
  body: string
  recommended_action: string
}

export interface DashboardMetric {
  label: string
  value: string
  change: string
  tone: MetricTone
}

export interface DashboardResponse {
  metrics: DashboardMetric[]
  orders: Order[]
  fulfillment: FulfillmentTask[]
  invoices: Invoice[]
  payments: Payment[]
  exceptions: Array<{
    type: string
    severity: string
    owner: string
    detail: string
  }>
}

export interface PipelineRun {
  extraction: Order
  validation: ValidationResult
  acknowledgement: Acknowledgement
  invoice: Invoice
  invoice_validation: InvoiceValidationResult
}

export interface UseCase {
  id: string
  name: string
  phase: string
  status: 'implemented' | 'scaffolded'
}

export interface InventoryItem {
  sku: string
  description: string
  active: boolean
  contract_price: number
  available_qty: number
  minimum_order_qty: number
}

export interface Vendor {
  id: string
  name: string
  contact: string
  rating: number
  status: string
  category: string
  active_pos: number
}

export interface ExceptionItem {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  owner: string
  status: 'open' | 'resolved'
  detail: string
  order_id?: string
  invoice_id?: string
}


