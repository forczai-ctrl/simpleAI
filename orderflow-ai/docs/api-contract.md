# API Contract

Base URL: `http://localhost:8000`

## Core Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health |
| GET | `/api/dashboard` | Aggregated dashboard data |
| GET | `/api/use-cases` | UC-01 through UC-24 implementation map |
| GET | `/api/orders` | Sample order queue |
| POST | `/api/orders/extract` | Extract order from raw text |
| POST | `/api/orders/upload` | Upload text-like order content |
| POST | `/api/orders/validate` | Validate an order |
| POST | `/api/orders/prioritize` | Score an order |
| POST | `/api/orders/acknowledge` | Generate customer acknowledgement |
| POST | `/api/fulfillment/schedule` | Create a fulfillment task |
| POST | `/api/invoice/generate` | Generate an invoice |
| POST | `/api/invoice/validate` | Validate an invoice |
| POST | `/api/payment/reconcile` | Match payment to invoices |
| POST | `/api/collections/remind` | Generate collections reminder |
| POST | `/api/pipeline/run` | Run intake-to-invoice pipeline |

## Example Extraction Request

```json
{
  "raw_text": "Purchase Order PO-2001\nCustomer: Northstar Market\nShip To Region: TX\nDelivery Date: 2026-07-05\nPayment Terms: NET 30\nItem SKU-COFFEE-12 Qty 6 Price 48.00",
  "channel": "email"
}
```

