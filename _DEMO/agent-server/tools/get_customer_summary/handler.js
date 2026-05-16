// [CHG-001] Extracted from lib/mock-data.js.
// Delegates to get_open_items and get_customer_details to avoid duplicating fixtures.

import { execute as getOpenItems }      from '../get_open_items/handler.js';
import { execute as getCustomerDetails } from '../get_customer_details/handler.js';

export async function execute(args, context) {
  const [openItemsRes, customerRes] = await Promise.all([
    getOpenItems({}, context),
    getCustomerDetails({}, context),
  ]);
  const items      = openItemsRes.d.results;
  const totalOpen  = items.reduce((sum, r) => sum + parseFloat(r.OpenAmountInTransCrcy), 0);
  return {
    customer:        customerRes.d,
    openItems:       items,
    totalOpenAmount: totalOpen.toFixed(2),
    currency:        'USD',
    overdueCount:    items.filter((r) => r.IsOverdue).length,
  };
}
