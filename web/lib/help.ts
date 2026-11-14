// Tooltip copy for every page and feature, in one place so wording stays consistent.
// Style: one or two short sentences; say what it's for or how to use it, never repeat the label.

export const NAV_HELP: Record<string, string> = {
  "/": "Your earnings, GST, expenses and kilometres at a glance",
  "/income": "Add what Uber, DiDi and delivery apps paid you, or import tax summaries",
  "/expenses": "Record costs like fuel and phone, with a photo of each receipt",
  "/logbook": "Odometer trips that work out how much of your driving is for work",
  "/bas": "The figures to copy into your quarterly Business Activity Statement",
  "/tax": "Your tax return figures and an estimate of your refund or bill",
  "/documents": "Lodged returns, platform summaries, reports and receipts in one place",
  "/settings": "Platforms, GST, business-use percentages and ATO rates",
};

export const HELP = {
  // Header
  fy: "The financial year you’re looking at (1 July – 30 June). Every page follows this choice.",

  // Dashboard
  earnings: "What the platforms paid you: net fare + promotions + tips. Switch between week, month and year, or pick a period from the list.",
  earningsPast: "Past years with a lodged tax return show the return’s figures, because that’s the official record.",
  basCard: "GST you’ll owe (or get back) on this quarter’s BAS, based on what you’ve entered so far.",
  incomeVsExpenses: "How much of your income goes on deductible expenses, by quarter. Excludes GST.",
  moneyGoes: "Your deductible expenses grouped by category, biggest first, so you can see what costs you most.",
  reports: "Ready-to-lodge PDFs. Preview in the browser, then download from the preview.",
  quarters: "Each BAS quarter’s sales, profit and GST. Tap one to see its income.",
  bank: "Download a CSV statement from your bank’s website. It’s read on this device only, never uploaded. Kerbside lists fuel, tolls, phone, parking and car costs it can’t find in your expenses.",
  fuel: "Log each fill-up with the odometer reading. Kerbside works out litres per 100 km and fuel cost per km between fills. Tick the box to also add it as a fuel expense.",
  super: "Self-employed drivers get no employer super. Money you put into super yourself can be claimed as a deduction, up to the yearly cap, if you send your fund a notice of intent first.",
  logbookMode: "The ATO logbook method needs 12 continuous weeks of records. Tap Start shift and End shift each time you drive for work; add private trips below. A photo of the odometer is good proof.",
  otherCars: "Each car needs its own logbook. Pick the car when you add a trip, start a shift or add a car expense. Cars costing under $20,000 are written off in full in the year you start using them.",
  scan: "Reads the photo on your device – nothing is sent anywhere. Works best on a flat, well-lit receipt. Always check what it fills in.",
  recurring: "Set up a cost once and Kerbside adds it on every due date, so nothing gets missed. Stopping keeps the ones already added.",
  reminders: "Things that need doing soon: BAS due dates, weeks without earnings, logbook check-ins and renewals. Add them to your phone’s calendar too.",
  setAside: "Move this into a separate savings account so the BAS and tax bills aren’t a shock. GST you collected, plus income tax at the rate you’re heading for this year.",
  hours: "Hours logged in to the app for these dates (in the app’s earnings or activity screen). Used to work out your real hourly rate.",
  goals: "A target for each week or month. Progress shows on the dashboard.",
  km: "Kilometres driven this year from your odometer readings or logbook. Tap to open the logbook.",

  // Income
  addEarnings: "One entry per platform per week works best. Copy the totals for those dates from the driver app.",
  platformPick: "Only the platforms you chose in Settings appear here.",
  fromTo: "The dates the earnings cover. “To” jumps to a week after “From”; change it for other periods.",
  netFare: "What you earned after the platform’s cut, before tips and promotions. Shown in the app’s earnings breakdown.",
  promotions: "Quests, boosts, incentives and bonuses. They’re business income too.",
  tips: "Tips from riders or customers. Include them – they’re taxable income.",
  serviceFee: "The platform’s fee taken from each fare. GST is charged on the full fare, so adding it keeps your BAS right.",
  importSummary: "Upload monthly Uber tax summaries (several at once). You check every figure before it’s added.",
  quarterTabs: "BAS quarters: Q1 Jul–Sep, Q2 Oct–Dec, Q3 Jan–Mar, Q4 Apr–Jun.",
  overlap: "Two entries for the same platform cover the same days, so that income is counted twice. Delete one.",

  // Expenses
  addExpense: "Enter the full amount on the receipt. Kerbside applies your business-use % and works out the GST credit.",
  category: "Picks the right tax line and GST treatment. Car costs use your car business-use %.",
  receipt: "Keep proof for 5 years. Photos are shrunk before upload; PDFs work too.",
  businessPct: "The share of this cost used for driving, from Settings for that quarter. Some categories are always 100%.",
  gstCredit: "GST you can claim back on your BAS: the business share of the GST in the price.",
  deductible: "What reduces your taxable income: the business share, minus the GST credit.",

  // Logbook
  businessUse: "Business km ÷ total km in your logbook period. Gaps between odometer readings count as private.",
  carOdometer: "Bought the car this year? Use the purchase date and odometer. These set your trip dates and depreciation days.",
  addTrip: "Enter odometer readings at the start and end. A whole week of one kind of driving can be one entry.",
  purpose: "Rideshare & delivery and other ABN work are business. Driving to a TFN job or personal trips aren’t.",
  platformKm: "Distance with a passenger or order on board, from imported summaries. Supporting evidence – not an odometer reading.",

  // BAS
  g1: "Total sales including GST: the full fares riders paid, including the platform’s fee.",
  a1: "GST on sales: 1/11 of your GST-inclusive sales.",
  b1: "GST credits on business purchases: fuel, phone, platform fees, a car, and so on.",
  g10: "Capital purchases like a car. Only fill in if your BAS asks for it.",
  g11: "Everyday business purchases. Only fill in if your BAS asks for it.",
  carTx: "Bought or sold a car used for driving? Its GST goes on that quarter’s BAS, capped at the ATO car limit.",

  // Tax
  estimate: "Income tax on your business profit plus anything entered below, at ATO resident rates. Your notice of assessment is final.",
  p8: "These match the Business and professional items schedule (P8) in myTax. All amounts exclude GST.",
  carMethod: "Logbook: actual costs × business %. Cents per km: business km × the ATO rate, up to 5,000 km.",
  yearEnd: "Things Kerbside can’t see from your entries. Fill these in before you lodge.",
  otherParts: "Wages and tax withheld are on your income statement in myGov.",
  depreciation: "Your car loses value each year and you can claim the business share. Uses the diminishing value method.",
  openingValue: "Car bought this year: its cost less GST credit (shown below the box). Later years: last year’s closing value.",

  // Documents
  upload: "Lodged returns (myGov print), Uber tax summaries or any other PDF. Figures are read automatically for you to check.",
  lodged: "Returns you’ve lodged. Their figures fill in previous years on the dashboard.",
  summaries: "Monthly or annual tax summaries from Uber.",
  reportsByYear: "BAS, tax summary and receipts reports for each year you have data for.",
  receiptsSummary: "Which expenses have proof attached. The proof pack PDF includes copies of photo receipts.",

  // Settings
  platforms: "Choose the work you do and the apps you drive for. Only these appear on the Income page.",
  gst: "Rideshare drivers must register from their first trip. Delivery-only drivers register at $75,000 turnover.",
  pctTable: "The share of each cost used for driving, per quarter. Q2–Q4 copy the quarter before; change any you need.",
  atoRates: "Update these when the ATO publishes the year’s car limit and cents-per-km rate.",
} as const;

export type HelpKey = keyof typeof HELP;
