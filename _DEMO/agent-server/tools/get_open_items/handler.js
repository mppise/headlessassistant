// [CHG-001] Extracted from lib/mock-data.js

const OPEN_ITEMS = {
  d: {
    results: [
      {
        CompCode: '1000',
        CustNum: '0000123456',
        InvoiceNum: 'INV-2024-0091',
        InvoiceDate: '/Date(1711584000000)/',
        DueDate:     '/Date(1713139200000)/',
        OpenAmountInTransCrcy: '584.00',
        TransactionCurrency: 'USD',
        DocumentType: 'RV',
        Scenario: 'D',
        AssignmentRef: 'Specialty Rx — Humira 40mg x2',
        IsOverdue: true,
      },
      {
        CompCode: '1000',
        CustNum: '0000123456',
        InvoiceNum: 'INV-2025-0112',
        InvoiceDate: '/Date(1746057600000)/',
        DueDate:     '/Date(1748736000000)/',
        OpenAmountInTransCrcy: '328.50',
        TransactionCurrency: 'USD',
        DocumentType: 'RV',
        Scenario: 'D',
        AssignmentRef: 'Monthly Rx — Metformin 500mg, Lisinopril 10mg',
        IsOverdue: false,
      },
      {
        CompCode: '1000',
        CustNum: '0000123456',
        InvoiceNum: 'INV-2025-0128',
        InvoiceDate: '/Date(1746230400000)/',
        DueDate:     '/Date(1748822400000)/',
        OpenAmountInTransCrcy: '372.00',
        TransactionCurrency: 'USD',
        DocumentType: 'RV',
        Scenario: 'D',
        AssignmentRef: 'Annual Wellness Supplies — Glucose meter, test strips',
        IsOverdue: false,
      },
      {
        CompCode: '1000',
        CustNum: '0000123456',
        InvoiceNum: 'CM-2025-0044',
        InvoiceDate: '/Date(1745971200000)/',
        DueDate:     '/Date(1748649600000)/',
        OpenAmountInTransCrcy: '-214.80',
        TransactionCurrency: 'USD',
        DocumentType: 'DG',
        Scenario: 'D',
        AssignmentRef: 'BlueCross BlueShield insurance credit — claim BC-9812',
        IsOverdue: false,
      },
    ],
  },
};

export async function execute(args, _context) {
  let items = [...OPEN_ITEMS.d.results];
  if (args?.Scenario && args.Scenario !== 'D') {
    const docTypeMap = { I: (r) => r.DocumentType === 'RV', C: (r) => r.DocumentType === 'DG' };
    const pred = docTypeMap[args.Scenario];
    if (pred) items = items.filter(pred);
  }
  if (args?.$top) items = items.slice(args.$skip ?? 0, (args.$skip ?? 0) + args.$top);
  return { d: { results: items } };
}
