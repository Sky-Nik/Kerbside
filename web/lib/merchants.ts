// Recognise common Australian merchants in receipt text or bank statement descriptions,
// and suggest the matching Kerbside expense category.
export type MerchantRule = { re: RegExp; name: string; category: string; kind: "fuel" | "toll" | "phone" | "parking" | "other" };

export const MERCHANTS: MerchantRule[] = [
  { re: /\bBP\b|\bBP CONNECT\b/i, name: "BP", category: "Car - Fuel", kind: "fuel" },
  { re: /\bSHELL\b|COLES EXPRESS|REDDY EXPRESS/i, name: "Shell", category: "Car - Fuel", kind: "fuel" },
  { re: /\bAMPOL\b|\bCALTEX\b|\bEG FUEL|\bEG GROUP/i, name: "Ampol", category: "Car - Fuel", kind: "fuel" },
  { re: /7[- ]?ELEVEN/i, name: "7-Eleven", category: "Car - Fuel", kind: "fuel" },
  { re: /\bUNITED (PETROLEUM)?\b|\bMETRO PETROLEUM|\bLIBERTY\b|\bPUMA ENERGY|\bOTR\b|\bMOBIL\b|\bVIVA ENERGY/i, name: "Fuel", category: "Car - Fuel", kind: "fuel" },
  { re: /\bTESLA SUPERCHARG|\bCHARGEFOX|\bEVIE\b|\bAMPCHARGE|\bJOLT\b/i, name: "EV charging", category: "Car - EV public charging", kind: "fuel" },
  { re: /\bLINKT\b|\bCITYLINK\b|\bEASTLINK\b|\bTRANSURBAN\b|\bE-?TOLL|\bGO VIA\b/i, name: "Tolls", category: "Tolls (business tolls not reimbursed)", kind: "toll" },
  { re: /\bOPTUS\b|\bTELSTRA\b|\bVODAFONE\b|\bBOOST MOBILE|\bAMAYSIM\b|\bBELONG\b|\bALDI MOBILE|\bFELIX MOBILE|\bLEBARA\b/i, name: "Mobile", category: "Mobile phone - mixed use", kind: "phone" },
  { re: /\bWILSON PARKING|\bSECURE PARKING|\bCARE PARK|\bPARKING\b|\bCELLOPARK|\bEASYPARK|\bPAYSTAY/i, name: "Parking", category: "Parking", kind: "parking" },
  { re: /CAR ?WASH|\bHAND WASH\b|\bSOAPY\b/i, name: "Car wash", category: "Car - Cleaning", kind: "other" },
  { re: /\bREPCO\b|\bSUPERCHEAP AUTO|\bAUTOBARN\b|\bBOB JANE|\bBEAUREPAIRES|\bKMART TYRE|\bULTRA TUNE|\bMIDAS\b/i, name: "Car parts / service", category: "Car - Servicing, repairs & tyres", kind: "other" },
  { re: /\bOFFICEWORKS\b/i, name: "Officeworks", category: "Stationery", kind: "other" },
  { re: /\bAAMI\b|\bNRMA\b|\bRACV\b|\bRAC\b|\bRACQ\b|\bBUDGET DIRECT|\bYOUI\b|\bALLIANZ\b|\bSUNCORP\b|\bGIO\b/i, name: "Car insurance", category: "Car - Insurance & CTP", kind: "other" },
  { re: /\bVICROADS\b|SERVICE NSW|\bTMR\b|TRANSPORT AND MAIN ROADS|\bREGO\b/i, name: "Registration", category: "Car - Registration", kind: "other" },
  { re: /\bSPLEND\b|\bUBER CAR|\bDRIVIBLE\b|\bCARHUA\b/i, name: "Car rental", category: "Car - Rent, hire & lease payments", kind: "other" },
];

export const matchMerchant = (text: string) => MERCHANTS.find((m) => m.re.test(text)) ?? null;
