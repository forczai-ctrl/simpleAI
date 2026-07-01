$ErrorActionPreference = "Stop"

$backend = "http://127.0.0.1:8000"

Invoke-RestMethod "$backend/health"
Invoke-RestMethod "$backend/api/dashboard"
Invoke-RestMethod -Method Post "$backend/api/pipeline/run" -ContentType "application/json" -Body (@{
    raw_text = "Purchase Order PO-2001`nCustomer: Northstar Market`nShip To Region: TX`nDelivery Date: 2026-07-05`nPayment Terms: NET 30`nItem SKU-COFFEE-12 Qty 6 Price 48.00"
    channel = "email"
} | ConvertTo-Json)

