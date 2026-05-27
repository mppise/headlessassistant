# [C03-F12] Python equivalent of tools/get_customer_summary/handler.js
# Delegates to get_open_items and get_customer_details — no data duplication.

from tools.get_open_items.handler import execute as get_open_items
from tools.get_customer_details.handler import execute as get_customer_details


async def execute(args: dict, context: dict) -> dict:
    import asyncio
    open_items_res, customer_res = await asyncio.gather(
        get_open_items({}, context),
        get_customer_details({}, context),
    )
    items = open_items_res["d"]["results"]
    total_open = sum(float(r["OpenAmountInTransCrcy"]) for r in items)
    return {
        "customer": customer_res["d"],
        "openItems": items,
        "totalOpenAmount": f"{total_open:.2f}",
        "currency": "USD",
        "overdueCount": sum(1 for r in items if r["IsOverdue"]),
    }
