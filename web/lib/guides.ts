// Plain-English tax guides for drivers (public, for search). Facts match the rules Kerbside uses for 2026-27.
export type Guide = { slug: string; title: string; description: string; updated: string; sections: { h: string; p: string[] }[] };

export const GUIDES: Guide[] = [
  {
    slug: "uber-driver-tax-australia",
    title: "Uber driver tax in Australia: the complete guide",
    description: "What rideshare drivers need to do for tax in Australia: ABN, GST from your first trip, quarterly BAS, what you can claim and how to lodge.",
    updated: "2026-11-17",
    sections: [
      { h: "You're running a business", p: [
        "When you drive for Uber, DiDi or any rideshare app in Australia you're a sole trader, not an employee. That means you need an ABN, nobody takes tax out of your pay, and you report your earnings yourself.",
        "Your earnings go in the business section of your tax return each year, and you can claim the costs of earning them: your car, phone, fees and more.",
      ] },
      { h: "GST from your very first trip", p: [
        "Rideshare is treated as taxi travel for GST, so you must register for GST before your first trip, whatever you earn. The usual $75,000 turnover threshold doesn't apply to rideshare.",
        "Being registered means you lodge a Business Activity Statement (BAS), usually every quarter, and you can claim GST credits on business costs like fuel and servicing.",
      ] },
      { h: "GST is on the full fare, not your payout", p: [
        "The ATO counts GST on the whole fare the rider pays. Your weekly payout is what's left after the platform's service fee, so if you only report your payout you'll under-report your sales.",
        "Add the service fee back on: total sales (BAS label G1) is your net fare plus the service fee. You then claim the GST included in the service fee back as a credit.",
      ] },
      { h: "What you can claim", p: [
        "Car costs for work trips (by the logbook or cents-per-km method), the platform's service fees, your phone and data for the work share, tolls and parking for work trips, car cleaning, dashcams and other equipment, and accounting fees.",
        "Keep receipts. For anything over $82.50 you need a proper tax invoice to claim the GST credit.",
      ] },
      { h: "Set money aside every week", p: [
        "Because no tax is taken out, put some of each week's earnings aside for GST and income tax. A good rule is the GST you'll owe on that week plus income tax at your marginal rate on your profit.",
        "Kerbside works this out for you every week on the dashboard.",
      ] },
    ],
  },
  {
    slug: "bas-for-rideshare-drivers",
    title: "How to do a BAS as a rideshare driver",
    description: "A step-by-step guide to the quarterly Business Activity Statement for Uber and DiDi drivers: G1, 1A, 1B, due dates and common mistakes.",
    updated: "2026-11-17",
    sections: [
      { h: "When it's due", p: [
        "If you lodge yourself, quarterly BAS is due on 28 October (July–September), 28 February (October–December), 28 April (January–March) and 28 July (April–June).",
      ] },
      { h: "The three numbers most drivers need", p: [
        "G1 Total sales: everything riders paid for your trips, including the platform's service fee, plus any other business income. Include GST.",
        "1A GST on sales: the GST included in G1 (one eleventh of taxable sales).",
        "1B GST on purchases: the GST credits on your business costs, such as the GST in the service fee, fuel and car costs (for the work share), and your phone.",
      ] },
      { h: "Common mistakes", p: [
        "Reporting your payout instead of the full fare. Forgetting to claim the GST in the service fee. Claiming GST on items with no GST (like insurance stamp duty or registration). Claiming 100% of costs you also use privately.",
      ] },
      { h: "Lodging", p: [
        "Log in to ATO online services through myGov, open your activity statement for the quarter, and enter G1, 1A and 1B. Pay the difference between 1A and 1B by the due date.",
        "Kerbside fills in a BAS report each quarter with these labels, ready to copy across.",
      ] },
    ],
  },
  {
    slug: "logbook-vs-cents-per-km",
    title: "Car expenses for drivers: logbook vs cents per km",
    description: "Which car expense method gives rideshare and delivery drivers a bigger deduction in 2026-27, and how the 12-week logbook works.",
    updated: "2026-11-17",
    sections: [
      { h: "Cents per km", p: [
        "Claim a set rate for each business kilometre: 91 cents per km for 2026-27, up to 5,000 km. You don't need receipts for car costs, but you need to show how you worked out the kilometres.",
        "At the cap that's $4,550, which is often less than full-time drivers actually spend.",
      ] },
      { h: "Logbook method", p: [
        "Keep a logbook for 12 continuous weeks that's representative of your driving. It gives your business-use percentage, which you apply to all your car costs: fuel, servicing, tyres, insurance, rego, interest and depreciation.",
        "A logbook stays valid for five years unless your driving pattern changes a lot. You need receipts for the costs.",
      ] },
      { h: "Which is better?", p: [
        "If you drive more than 5,000 business km a year, the logbook method usually wins because there's no km cap. Kerbside works out both every year and tells you which gives the bigger deduction.",
      ] },
      { h: "Buying a car", p: [
        "Depreciation is limited by the car cost limit. Small businesses can claim a car costing under $20,000 in full in the year they start using it (instant asset write-off), for the business share.",
      ] },
    ],
  },
  {
    slug: "food-delivery-driver-tax",
    title: "Tax for food delivery drivers (Uber Eats, DoorDash, HungryPanda)",
    description: "Do delivery riders and drivers need GST? What can you claim, and how is it different from rideshare?",
    updated: "2026-11-17",
    sections: [
      { h: "GST works differently from rideshare", p: [
        "Delivery-only drivers and riders only have to register for GST once their business turnover reaches $75,000 a year. If you also do rideshare, you must be registered from your first rideshare trip, and then GST applies to your delivery income too.",
      ] },
      { h: "What you can claim", p: [
        "The work share of your car, scooter or bike costs, phone and data, insulated bags, and platform fees. If you're registered for GST you can also claim GST credits on these.",
      ] },
      { h: "Keep it simple", p: [
        "Record each week's earnings from the app, snap receipts as you go, and keep a logbook if you use a car. Kerbside handles the GST and tax-return labels for you.",
      ] },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;
