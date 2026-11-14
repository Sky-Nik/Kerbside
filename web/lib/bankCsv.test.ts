import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBankCsv, reviewStatement } from "./bankCsv.ts";

test("CommBank (no header) and header formats", () => {
  const cba = `14/11/2026,"-79.95","BP GLEN WAVERLEY VIC AUS Card xx1234","+1200.00"\n13/11/2026,"+512.30","UBER B.V. PAYMENT","+1279.95"\n12/11/2026,"-4.20","LINKT MELBOURNE","+767.65"`;
  const rows = parseBankCsv(cba);
  assert.deepEqual(rows[0], { date: "2026-11-14", amount: -79.95, description: "BP GLEN WAVERLEY VIC AUS Card xx1234" });
  assert.equal(rows.length, 3);
  const anz = `Date,Description,Debit,Credit,Balance\n02 Nov 2026,OPTUS MOBILE,45.00,,100\n03 Nov 2026,DIDI MOBILITY,,210.50,310.50`;
  const r2 = parseBankCsv(anz);
  assert.deepEqual(r2.map((r) => [r.date, r.amount]), [["2026-11-02", -45], ["2026-11-03", 210.5]]);
});

test("skips recorded costs, totals payouts", () => {
  const rows = parseBankCsv(`14/11/2026,-79.95,BP GLEN WAVERLEY,0\n12/11/2026,-4.20,LINKT MELBOURNE,0\n11/11/2026,-30.00,WOOLWORTHS,0\n13/11/2026,512.30,UBER B.V.,0\n10/11/2026,100.00,DIDI,0`);
  const r = reviewStatement(rows, [{ date: "2026-11-13", amount: 79.95 }]);
  assert.deepEqual(r.suggestions.map((s) => [s.description, s.category]), [["LINKT MELBOURNE", "Tolls (business tolls not reimbursed)"]]);
  assert.deepEqual(r.payouts, { Uber: 512.3, DiDi: 100 });
  assert.equal(r.from, "2026-11-10");
});
