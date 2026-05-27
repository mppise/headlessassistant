# [C03-F12] Python equivalent of tools/get_payer_info/handler.js

CUST = "0000123456"
COMP = "1000"

PAYER_INFO = {
    "d": {
        "results": [
            {
                "Origin": "ZRE",
                "Customer": CUST,
                "PayerCustomer": "0000100001",
                "PayerName": "BlueCross BlueShield",
                "PayerType": "INS",
                "CompanyCode": COMP,
            },
            {
                "Origin": "ZRE",
                "Customer": CUST,
                "PayerCustomer": "0000100042",
                "PayerName": "Medicare Part D — SilverScript Choice",
                "PayerType": "GOV",
                "CompanyCode": COMP,
            },
        ]
    }
}

SHIPTO_PAYERS: dict[str, list] = {
    "2052038163": [{"Origin": "vantus", "Customer": "2052038163", "PayerCustomer": "0000100001", "PayerName": "BlueCross BlueShield", "PayerType": "INS", "CompanyCode": COMP}],
    "2052038165": [{"Origin": "vantus", "Customer": "2052038165", "PayerCustomer": "0000100055", "PayerName": "Aetna Medicare Advantage", "PayerType": "INS", "CompanyCode": COMP}],
    "2052038110": [{"Origin": "vantus", "Customer": "2052038110", "PayerCustomer": "0000100042", "PayerName": "Medicare Part D — SilverScript Choice", "PayerType": "GOV", "CompanyCode": COMP}],
    "2052038093": [{"Origin": "vantus", "Customer": "2052038093", "PayerCustomer": "0000100063", "PayerName": "UnitedHealthcare Community Plan", "PayerType": "INS", "CompanyCode": COMP}],
    "2052038143": [{"Origin": "vantus", "Customer": "2052038143", "PayerCustomer": "0000100001", "PayerName": "BlueCross BlueShield", "PayerType": "INS", "CompanyCode": COMP}],
    "2057202996": [{"Origin": "vantus", "Customer": "2057202996", "PayerCustomer": "0000100078", "PayerName": "Cigna Healthcare", "PayerType": "INS", "CompanyCode": COMP}],
    "2052008183": [{"Origin": "vantus", "Customer": "2052008183", "PayerCustomer": "0000100042", "PayerName": "Medicare Part D — SilverScript Choice", "PayerType": "GOV", "CompanyCode": COMP}],
    "2057196517": [{"Origin": "vantus", "Customer": "2057196517", "PayerCustomer": "0000100091", "PayerName": "Humana Gold Plus HMO", "PayerType": "INS", "CompanyCode": COMP}],
}


async def execute(args: dict, _context: dict) -> dict:
    customers = args.get("customers")
    if not customers:
        return PAYER_INFO

    results = []
    for entry in customers:
        cust_num = entry.get("Customer", "")
        payers = SHIPTO_PAYERS.get(cust_num)
        if payers:
            results.extend(payers)
        else:
            results.append({
                "Origin": entry.get("Origin", "vantus"),
                "Customer": cust_num,
                "PayerCustomer": None,
                "PayerName": "No payer on file",
                "PayerType": None,
                "CompanyCode": COMP,
            })
    return {"d": {"results": results}}
