# [C03-F12] Python equivalent of tools/get_open_items/handler.js

import copy

OPEN_ITEMS = {
    "d": {
        "results": [
            {
                "CompCode": "1000",
                "CustNum": "0000123456",
                "InvoiceNum": "INV-2024-0091",
                "InvoiceDate": "/Date(1711584000000)/",
                "DueDate": "/Date(1713139200000)/",
                "OpenAmountInTransCrcy": "584.00",
                "TransactionCurrency": "USD",
                "DocumentType": "RV",
                "Scenario": "D",
                "AssignmentRef": "Specialty Rx — Humira 40mg x2",
                "IsOverdue": True,
            },
            {
                "CompCode": "1000",
                "CustNum": "0000123456",
                "InvoiceNum": "INV-2025-0112",
                "InvoiceDate": "/Date(1746057600000)/",
                "DueDate": "/Date(1748736000000)/",
                "OpenAmountInTransCrcy": "328.50",
                "TransactionCurrency": "USD",
                "DocumentType": "RV",
                "Scenario": "D",
                "AssignmentRef": "Monthly Rx — Metformin 500mg, Lisinopril 10mg",
                "IsOverdue": False,
            },
            {
                "CompCode": "1000",
                "CustNum": "0000123456",
                "InvoiceNum": "INV-2025-0128",
                "InvoiceDate": "/Date(1746230400000)/",
                "DueDate": "/Date(1748822400000)/",
                "OpenAmountInTransCrcy": "372.00",
                "TransactionCurrency": "USD",
                "DocumentType": "RV",
                "Scenario": "D",
                "AssignmentRef": "Annual Wellness Supplies — Glucose meter, test strips",
                "IsOverdue": False,
            },
            {
                "CompCode": "1000",
                "CustNum": "0000123456",
                "InvoiceNum": "CM-2025-0044",
                "InvoiceDate": "/Date(1745971200000)/",
                "DueDate": "/Date(1748649600000)/",
                "OpenAmountInTransCrcy": "-214.80",
                "TransactionCurrency": "USD",
                "DocumentType": "DG",
                "Scenario": "D",
                "AssignmentRef": "BlueCross BlueShield insurance credit — claim BC-9812",
                "IsOverdue": False,
            },
        ]
    }
}


async def execute(args: dict, _context: dict) -> dict:
    items = list(OPEN_ITEMS["d"]["results"])

    scenario = args.get("Scenario")
    if scenario and scenario != "D":
        if scenario == "I":
            items = [r for r in items if r["DocumentType"] == "RV"]
        elif scenario == "C":
            items = [r for r in items if r["DocumentType"] == "DG"]

    skip = args.get("$skip", 0) or 0
    top = args.get("$top")
    if top:
        items = items[skip: skip + top]

    return {"d": {"results": items}}
