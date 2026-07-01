import type { Order } from '../types'

export function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

export function percent(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format(value)
}

export function orderTotal(order: Order) {
  return order.total_amount ?? order.items.reduce((total, item) => total + item.quantity * item.unit_price, 0)
}

