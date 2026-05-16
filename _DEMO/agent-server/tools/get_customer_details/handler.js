// [CHG-001] Extracted from lib/mock-data.js

const CUST = '0000123456';
const COMP = '1000';

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

export async function execute(_args, _context) {
  return CUSTOMER_DETAILS;
}
