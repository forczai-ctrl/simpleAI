from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_dashboard_returns_metrics() -> None:
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert len(body["metrics"]) == 4
    assert body["orders"]


def test_pipeline_run_generates_validated_invoice() -> None:
    response = client.post(
        "/api/pipeline/run",
        json={
            "raw_text": "Purchase Order PO-2001\nCustomer: Northstar Market\nShip To Region: TX\nDelivery Date: 2026-07-05\nPayment Terms: NET 30\nItem SKU-COFFEE-12 Qty 6 Price 48.00",
            "channel": "email",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["extraction"]["po_number"] == "PO-2001"
    assert body["validation"]["approved"] is True
    assert body["invoice_validation"]["approved"] is True

