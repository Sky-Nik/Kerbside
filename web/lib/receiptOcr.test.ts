import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReceipt } from "./receiptOcr.ts";
import { matchMerchant } from "./merchants.ts";

const BP = `BP Glen Waverley
TAX INVOICE ABN 12 345 678 901
14/11/2026 18:42
Unleaded 91   42.10L @ 1.899
Fuel                     $79.95
SUBTOTAL                 $79.95
TOTAL                    $79.95
Includes GST              $7.27
EFTPOS                   $79.95`;

test("fuel receipt: total, GST, date, supplier and category", () => {
  const r = parseReceipt(BP, "2026-11-15");
  assert.deepEqual(r, { total: 79.95, gst: 7.27, date: "2026-11-14", supplier: "BP", category: "Car - Fuel" });
});

test("text month dates, unknown supplier, future dates ignored", () => {
  const r = parseReceipt("Joe's Cafe\n3 Nov 2026\nTotal $12.50\n01/01/2030", "2026-11-15");
  assert.equal(r.date, "2026-11-03");
  assert.equal(r.total, 12.5);
  assert.equal(r.supplier, "Joe's Cafe");
  assert.equal(r.category, null);
});

test("merchant rules", () => {
  assert.equal(matchMerchant("LINKT MELBOURNE")?.category, "Tolls (business tolls not reimbursed)");
  assert.equal(matchMerchant("OPTUS BILLING")?.kind, "phone");
  assert.equal(matchMerchant("WOOLWORTHS 123"), null);
});
