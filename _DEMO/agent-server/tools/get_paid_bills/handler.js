// [CHG-001] Extracted from lib/mock-data.js

const PAID_BILLS_CLEARED = {
  d: {
    results: [
      {
        CompCode: '1000',
        CustNum: '0000123456',
        ClearingDoc: '1500055321',
        InvoiceNum: 'INV-2025-0098',
        PaymentAmount: '412.00',
        Currency: 'USD',
        ClearingDate: '/Date(1746057600000)/',
        ValueDate:    '/Date(1746057600000)/',
        InvoiceProcessingStatus: '9',
        PaymentMethod: 'VISA/*****4291',
        AssignmentRef: 'Monthly Rx refill — April 2025',
      },
      {
        CompCode: '1000',
        CustNum: '0000123456',
        ClearingDoc: '1500054887',
        InvoiceNum: 'INV-2025-0081',
        PaymentAmount: '290.50',
        Currency: 'USD',
        ClearingDate: '/Date(1743465600000)/',
        ValueDate:    '/Date(1743465600000)/',
        InvoiceProcessingStatus: '9',
        PaymentMethod: 'ACH AutoPay',
        AssignmentRef: 'Specialty Rx — March 2025',
      },
      {
        CompCode: '1000',
        CustNum: '0000123456',
        ClearingDoc: '1500054102',
        InvoiceNum: 'INV-2025-0060',
        PaymentAmount: '380.00',
        Currency: 'USD',
        ClearingDate: '/Date(1741132800000)/',
        ValueDate:    '/Date(1741132800000)/',
        InvoiceProcessingStatus: '9',
        PaymentMethod: 'MC/*****8872',
        AssignmentRef: 'Monthly Rx — February 2025',
      },
    ],
  },
};

const PAID_BILLS_UNCLEARED = {
  d: {
    results: [
      {
        CompCode: '1000',
        CustNum: '0000123456',
        ClearingDoc: '1500055890',
        InvoiceNum: 'INV-2025-0107',
        PaymentAmount: '215.00',
        Currency: 'USD',
        ClearingDate: '/Date(1746144000000)/',
        ValueDate:    '/Date(1746144000000)/',
        InvoiceProcessingStatus: '2',
        PaymentMethod: 'VISA/*****4291',
        AssignmentRef: 'Pending processing',
      },
    ],
  },
};

export async function execute(args, _context) {
  const status = args?.status ?? '9';
  return status === '2' ? PAID_BILLS_UNCLEARED : PAID_BILLS_CLEARED;
}
