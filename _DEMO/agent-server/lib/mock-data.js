// Mock response fixtures for EPP Swiftpay APIs.
// Shapes mirror the real OData responses from the Postman collection.
// Replace with real HTTP calls when integrating against the dev/prod environment.

const CUST = '0000123456';
const COMP = '1000';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CUSTOMER_DETAILS = {
  d: {
    BusinessPartner: CUST,
    BusinessPartnerName: 'DOCTORS PARK PHARMACY',
    OrganizationBPName1: 'DOCTORS PARK PHARMACY',
    OrganizationBPName2: 'HULIN INC',
    BusinessPartnerCategory: '2',
    BusinessPartnerGrouping: 'ZPST',
    IsMarkedForArchiving: false,
    BusinessPartnerIsBlocked: false,
    to_PaymentCard: {
      results: [
        {
          BusinessPartner: CUST,
          PaymentCardID: '000001',
          PaymentCardType: 'VISA',
          CardDescription: 'VISA/*****4291',
          ValidityEndDate: '/Date(1785484800000)/',
          CardHolder: 'Sarah M. Johnson',
          IsStandardCard: true,
        },
        {
          BusinessPartner: CUST,
          PaymentCardID: '000002',
          PaymentCardType: 'MC',
          CardDescription: 'MC/*****8872',
          ValidityEndDate: '/Date(1743292800000)/',
          CardHolder: 'Sarah M. Johnson',
          IsStandardCard: false,
        },
      ],
    },
    to_BusinessPartnerBank: {
      results: [
        {
          BusinessPartner: CUST,
          BankIdentification: 'E000',
          BankCountryKey: 'US',
          BankName: 'CHASE BANK',
          BankNumber: '021000021',
          BankAccountHolderName: 'Sarah M. Johnson',
          BankAccount: '****3310',
          CollectionAuthInd: true,
        },
      ],
    },
    to_Customer: {
      Customer: CUST,
      CustomerFullName: 'DOCTORS PARK PHARMACY HULIN INC',
      PaymentTerms: 'NET30',
      to_CustomerCompany: {
        results: [
          {
            Customer: CUST,
            CompanyCode: COMP,
            PaymentTerms: 'Y030',
            CustomerAccountGroup: 'ZPST',
            DeletionIndicator: false,
          },
        ],
      },
    },
    to_BusinessPartnerAddress: {
      results: [
        {
          BusinessPartner: CUST,
          AddressID: '0003648510',
          StreetName: '500 E ROBINSON ST STE 200',
          CityName: 'NORMAN',
          Region: 'OK',
          PostalCode: '73071-6648',
          Country: 'US',
          AddressTimeZone: 'CST',
          to_EmailAddress: {
            results: [{ EmailAddress: 'sarah.johnson@drsparkrx.com', IsDefaultEmailAddress: true }],
          },
          to_PhoneNumber: {
            results: [{ InternationalPhoneNumber: '+14053640420', IsDefaultPhoneNumber: true }],
          },
          to_FaxNumber: {
            results: [{ InternationalFaxNumber: '+14053645021', IsDefaultFaxNumber: true }],
          },
          to_MobilePhoneNumber: { results: [] },
        },
      ],
    },
  },
};

const OPEN_ITEMS = {
  d: {
    results: [
      {
        CompCode: COMP,
        CustNum: CUST,
        InvoiceNum: 'INV-2024-0091',
        InvoiceDate: '/Date(1711584000000)/',   // 2024-03-28
        DueDate:     '/Date(1713139200000)/',   // 2024-04-15
        OpenAmountInTransCrcy: '584.00',
        TransactionCurrency: 'USD',
        DocumentType: 'RV',
        Scenario: 'D',
        AssignmentRef: 'Specialty Rx — Humira 40mg x2',
        IsOverdue: true,
      },
      {
        CompCode: COMP,
        CustNum: CUST,
        InvoiceNum: 'INV-2025-0112',
        InvoiceDate: '/Date(1746057600000)/',   // 2025-04-30
        DueDate:     '/Date(1748736000000)/',   // 2025-05-31
        OpenAmountInTransCrcy: '328.50',
        TransactionCurrency: 'USD',
        DocumentType: 'RV',
        Scenario: 'D',
        AssignmentRef: 'Monthly Rx — Metformin 500mg, Lisinopril 10mg',
        IsOverdue: false,
      },
      {
        CompCode: COMP,
        CustNum: CUST,
        InvoiceNum: 'INV-2025-0128',
        InvoiceDate: '/Date(1746230400000)/',   // 2025-05-02
        DueDate:     '/Date(1748822400000)/',   // 2025-06-01
        OpenAmountInTransCrcy: '372.00',
        TransactionCurrency: 'USD',
        DocumentType: 'RV',
        Scenario: 'D',
        AssignmentRef: 'Annual Wellness Supplies — Glucose meter, test strips',
        IsOverdue: false,
      },
      {
        CompCode: COMP,
        CustNum: CUST,
        InvoiceNum: 'CM-2025-0044',
        InvoiceDate: '/Date(1745971200000)/',   // 2025-04-01
        DueDate:     '/Date(1748649600000)/',   // 2025-05-30
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

const PAID_BILLS_CLEARED = {
  d: {
    results: [
      {
        CompCode: COMP,
        CustNum: CUST,
        ClearingDoc: '1500055321',
        InvoiceNum: 'INV-2025-0098',
        PaymentAmount: '412.00',
        Currency: 'USD',
        ClearingDate: '/Date(1746057600000)/',  // 2025-05-01
        ValueDate:    '/Date(1746057600000)/',
        InvoiceProcessingStatus: '9',
        PaymentMethod: 'VISA/*****4291',
        AssignmentRef: 'Monthly Rx refill — April 2025',
      },
      {
        CompCode: COMP,
        CustNum: CUST,
        ClearingDoc: '1500054887',
        InvoiceNum: 'INV-2025-0081',
        PaymentAmount: '290.50',
        Currency: 'USD',
        ClearingDate: '/Date(1743465600000)/',  // 2025-04-02
        ValueDate:    '/Date(1743465600000)/',
        InvoiceProcessingStatus: '9',
        PaymentMethod: 'ACH AutoPay',
        AssignmentRef: 'Specialty Rx — March 2025',
      },
      {
        CompCode: COMP,
        CustNum: CUST,
        ClearingDoc: '1500054102',
        InvoiceNum: 'INV-2025-0060',
        PaymentAmount: '380.00',
        Currency: 'USD',
        ClearingDate: '/Date(1741132800000)/',  // 2025-03-05
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
        CompCode: COMP,
        CustNum: CUST,
        ClearingDoc: '1500055890',
        InvoiceNum: 'INV-2025-0107',
        PaymentAmount: '215.00',
        Currency: 'USD',
        ClearingDate: '/Date(1746144000000)/',  // 2025-05-02
        ValueDate:    '/Date(1746144000000)/',
        InvoiceProcessingStatus: '2',
        PaymentMethod: 'VISA/*****4291',
        AssignmentRef: 'Pending processing',
      },
    ],
  },
};

const PAYER_INFO = {
  d: {
    results: [
      {
        Origin: 'ZRE',
        Customer: CUST,
        PayerCustomer: '0000100001',
        PayerName: 'BlueCross BlueShield',
        PayerType: 'INS',
        CompanyCode: COMP,
      },
      {
        Origin: 'ZRE',
        Customer: CUST,
        PayerCustomer: '0000100042',
        PayerName: 'Medicare Part D — SilverScript Choice',
        PayerType: 'GOV',
        CompanyCode: COMP,
      },
    ],
  },
};

// Fixture payers for additional ship-to customers (mirrors /payerInfo POST multi-customer lookup)
const SHIPTO_PAYERS = {
  '2052038163': [{ Origin: 'vantus', Customer: '2052038163', PayerCustomer: '0000100001', PayerName: 'BlueCross BlueShield', PayerType: 'INS', CompanyCode: COMP }],
  '2052038165': [{ Origin: 'vantus', Customer: '2052038165', PayerCustomer: '0000100055', PayerName: 'Aetna Medicare Advantage', PayerType: 'INS', CompanyCode: COMP }],
  '2052038110': [{ Origin: 'vantus', Customer: '2052038110', PayerCustomer: '0000100042', PayerName: 'Medicare Part D — SilverScript Choice', PayerType: 'GOV', CompanyCode: COMP }],
  '2052038093': [{ Origin: 'vantus', Customer: '2052038093', PayerCustomer: '0000100063', PayerName: 'UnitedHealthcare Community Plan', PayerType: 'INS', CompanyCode: COMP }],
  '2052038143': [{ Origin: 'vantus', Customer: '2052038143', PayerCustomer: '0000100001', PayerName: 'BlueCross BlueShield', PayerType: 'INS', CompanyCode: COMP }],
  '2057202996': [{ Origin: 'vantus', Customer: '2057202996', PayerCustomer: '0000100078', PayerName: 'Cigna Healthcare', PayerType: 'INS', CompanyCode: COMP }],
  '2052008183': [{ Origin: 'vantus', Customer: '2052008183', PayerCustomer: '0000100042', PayerName: 'Medicare Part D — SilverScript Choice', PayerType: 'GOV', CompanyCode: COMP }],
  '2057196517': [{ Origin: 'vantus', Customer: '2057196517', PayerCustomer: '0000100091', PayerName: 'Humana Gold Plus HMO', PayerType: 'INS', CompanyCode: COMP }],
};

// ── Tool executor ─────────────────────────────────────────────────────────────

function mockGetOpenItems(args) {
  let items = [...OPEN_ITEMS.d.results];
  if (args?.Scenario && args.Scenario !== 'D') {
    const docTypeMap = { I: (r) => r.DocumentType === 'RV', C: (r) => r.DocumentType === 'DG' };
    const pred = docTypeMap[args.Scenario];
    if (pred) items = items.filter(pred);
  }
  if (args?.$top) items = items.slice(args.$skip ?? 0, (args.$skip ?? 0) + args.$top);
  return { d: { results: items } };
}

function mockGetCustomerDetails() {
  return CUSTOMER_DETAILS;
}

function mockGetPaidBills(args) {
  const status = args?.status ?? '9';
  return status === '2' ? PAID_BILLS_UNCLEARED : PAID_BILLS_CLEARED;
}

function mockGetPayerInfo(args) {
  const customers = args?.customers;
  if (!customers || customers.length === 0) return PAYER_INFO;
  const results = customers.flatMap(({ Customer }) => SHIPTO_PAYERS[Customer] ?? [
    { Origin: args.Origin ?? 'vantus', Customer, PayerCustomer: null, PayerName: 'No payer on file', PayerType: null, CompanyCode: COMP },
  ]);
  return { d: { results } };
}

function mockGetCustomerSummary() {
  const openItems = mockGetOpenItems({});
  const customer  = mockGetCustomerDetails();
  const totalOpen = openItems.d.results.reduce(
    (sum, r) => sum + parseFloat(r.OpenAmountInTransCrcy),
    0,
  );
  return {
    customer:        customer.d,
    openItems:       openItems.d.results,
    totalOpenAmount: totalOpen.toFixed(2),
    currency:        'USD',
    overdueCount:    openItems.d.results.filter((r) => r.IsOverdue).length,
  };
}

export async function executeTool(toolName, args) {
  switch (toolName) {
    case 'get_open_items':       return mockGetOpenItems(args);
    case 'get_customer_details': return mockGetCustomerDetails(args);
    case 'get_paid_bills':       return mockGetPaidBills(args);
    case 'get_payer_info':       return mockGetPayerInfo(args);
    case 'get_customer_summary': return mockGetCustomerSummary(args);
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}
