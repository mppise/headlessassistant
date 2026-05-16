// [CHG-001] Extracted from lib/mock-data.js

const CUST = '0000123456';
const COMP = '1000';

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

const SHIPTO_PAYERS = {
  '2052038163': [{ Origin: 'vantus', Customer: '2052038163', PayerCustomer: '0000100001', PayerName: 'BlueCross BlueShield',                    PayerType: 'INS', CompanyCode: COMP }],
  '2052038165': [{ Origin: 'vantus', Customer: '2052038165', PayerCustomer: '0000100055', PayerName: 'Aetna Medicare Advantage',                PayerType: 'INS', CompanyCode: COMP }],
  '2052038110': [{ Origin: 'vantus', Customer: '2052038110', PayerCustomer: '0000100042', PayerName: 'Medicare Part D — SilverScript Choice',   PayerType: 'GOV', CompanyCode: COMP }],
  '2052038093': [{ Origin: 'vantus', Customer: '2052038093', PayerCustomer: '0000100063', PayerName: 'UnitedHealthcare Community Plan',         PayerType: 'INS', CompanyCode: COMP }],
  '2052038143': [{ Origin: 'vantus', Customer: '2052038143', PayerCustomer: '0000100001', PayerName: 'BlueCross BlueShield',                    PayerType: 'INS', CompanyCode: COMP }],
  '2057202996': [{ Origin: 'vantus', Customer: '2057202996', PayerCustomer: '0000100078', PayerName: 'Cigna Healthcare',                        PayerType: 'INS', CompanyCode: COMP }],
  '2052008183': [{ Origin: 'vantus', Customer: '2052008183', PayerCustomer: '0000100042', PayerName: 'Medicare Part D — SilverScript Choice',   PayerType: 'GOV', CompanyCode: COMP }],
  '2057196517': [{ Origin: 'vantus', Customer: '2057196517', PayerCustomer: '0000100091', PayerName: 'Humana Gold Plus HMO',                    PayerType: 'INS', CompanyCode: COMP }],
};

export async function execute(args, _context) {
  const customers = args?.customers;
  if (!customers || customers.length === 0) return PAYER_INFO;
  const results = customers.flatMap(({ Customer }) =>
    SHIPTO_PAYERS[Customer] ?? [
      { Origin: args.Origin ?? 'vantus', Customer, PayerCustomer: null, PayerName: 'No payer on file', PayerType: null, CompanyCode: COMP },
    ],
  );
  return { d: { results } };
}
