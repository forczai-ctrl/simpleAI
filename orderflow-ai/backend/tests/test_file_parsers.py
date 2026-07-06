import io
import openpyxl
from app.utils.file_parsers import parse_csv, parse_excel


def test_parse_csv() -> None:
    csv_data = b"PO,Customer,SKU,Qty,Price\nPO-2001,Northstar Market,SKU-COFFEE-12,6,48.00\n"
    result = parse_csv(csv_data)
    assert "Row 1: PO | Customer | SKU | Qty | Price" in result
    assert "Row 2: PO-2001 | Northstar Market | SKU-COFFEE-12 | 6 | 48.00" in result


def test_parse_excel() -> None:
    # Generate a simple Excel in memory
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "OrderSheet"
    ws.append(["PO", "Customer", "SKU"])
    ws.append(["PO-3001", "Bluebird Foods", "SKU-TEA-24"])
    
    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_data = excel_file.getvalue()
    
    result = parse_excel(excel_data)
    assert "Sheet: OrderSheet" in result
    assert "Row 1: PO | Customer | SKU" in result
    assert "Row 2: PO-3001 | Bluebird Foods | SKU-TEA-24" in result
