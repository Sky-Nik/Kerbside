// Shared building blocks for Kerbside PDF reports (react-pdf). Layout follows a platform tax summary:
// coloured top bar, logo + taxpayer block, big headline figures, grey row groups, bold total bars, footer.
import { Circle, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

export const C = { ink: "#000000", ink2: "#333333", mute: "#6B6B6B", line: "#E2E2E2", wash: "#F3F3F3", kerb: "#FFC043",
  kerbSoft: "#FFF4D9", pos: "#05944F", neg: "#C52A1A" };

const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
export const money = (n: number) => (n < 0 ? `-${AUD.format(-n).replace("$", "A$")}` : AUD.format(n).replace("$", "A$"));
/** ATO: enter whole dollars, don't round up (drop the cents). */
export const dollars = (n: number) => `${n < 0 ? "-" : ""}$${Math.trunc(Math.abs(n)).toLocaleString("en-AU")}`;
export const date = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const fySlash = (fy: string) => `FY ${fy.slice(0, 4)}/${Number(fy.slice(0, 4)) + 1}`;

export const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: C.ink, paddingTop: 112, paddingBottom: 86, paddingHorizontal: 40 },
  topbar: { position: "absolute", top: 0, left: 0, right: 0, height: 7, backgroundColor: C.kerb },
  header: { position: "absolute", top: 34, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingBottom: 14, borderBottomWidth: 0.6, borderBottomColor: C.line },
  who: { alignItems: "flex-end", fontSize: 7.5, color: C.ink2, lineHeight: 1.35 },
  footer: { position: "absolute", bottom: 26, left: 40, right: 40, borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", fontSize: 7, color: C.mute, lineHeight: 1.5 },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 22, letterSpacing: -0.4, marginBottom: 4 },
  sub: { fontSize: 12, color: C.ink2, marginBottom: 20 },
  blockTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 14, marginBottom: 6 },
  rows: { backgroundColor: C.wash },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6.5, paddingHorizontal: 10 },
  total: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.wash, marginTop: 4, paddingVertical: 10,
    paddingHorizontal: 10, fontFamily: "Helvetica-Bold", fontSize: 12.5 },
  p: { fontSize: 9, color: C.ink2, lineHeight: 1.5, marginBottom: 6 },
  small: { fontSize: 7.5, color: C.mute, lineHeight: 1.45 },
});

export function Mark({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="0" y="0" width="64" height="64" rx="14" fill={C.ink} />
      <Path d="M21.5 13v30" stroke="#FFFFFF" strokeWidth={9} />
      <Path d="M47.5 13 28 29.5 47.5 43" stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinejoin="miter" />
      <Rect x="17" y="48" width="34" height="4.5" rx="2.25" fill={C.kerb} />
    </Svg>
  );
}

export function Brand() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Mark size={30} />
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, letterSpacing: -0.8, marginLeft: 8 }}>Kerbside</Text>
    </View>
  );
}

/** One A4 page with the fixed top bar, header and footer. */
export function Sheet({ name, abn, docTitle, children }: { name: string; abn: string | null; docTitle: string; children: ReactNode }) {
  return (
    <Page size="A4" style={s.page}>
      <View fixed style={s.topbar} />
      <View fixed style={s.header}>
        <Brand />
        <View style={s.who}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, color: C.ink }}>{name.toUpperCase()}</Text>
          <Text>Australian Business Number (ABN): {abn ? abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4") : "not set – add it in Settings"}</Text>
          <Text>{docTitle}</Text>
        </View>
      </View>
      {children}
      <View fixed style={s.footer}>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 90 }}>
          <Text>Kerbside · {docTitle}</Text>
          <Text>Prepared from your Kerbside records. Not an ATO document – check figures against your records before lodging.</Text>
        </View>
      </View>
      {/* Page number sits directly on the page: react-pdf misplaces `render` text inside positioned rows. */}
      <Text fixed style={{ position: "absolute", bottom: 32, right: 40, fontSize: 9, color: C.ink }}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </Page>
  );
}

export const Title = ({ title, sub }: { title: string; sub: string }) => (
  <View>
    <Text style={s.h1}>{title}</Text>
    <Text style={s.sub}>{sub}</Text>
  </View>
);

export function Rows({ title, rows, total }: { title?: string; rows: [string, string][]; total?: [string, string] }) {
  return (
    <View wrap={false}>
      {title && <Text style={s.blockTitle}>{title}</Text>}
      {rows.length > 0 && (
        <View style={s.rows}>
          {rows.map(([k, v], i) => (
            <View key={i} style={s.row}><Text>{k}</Text><Text>{v}</Text></View>
          ))}
        </View>
      )}
      {total && <View style={s.total}><Text>{total[0]}</Text><Text>{total[1]}</Text></View>}
    </View>
  );
}

/** An ATO form label box: [G1] Total sales ........ $1,234 */
export function LabelBox({ label, desc, value, note }: { label: string; desc: string; value: string; note?: string }) {
  return (
    <View wrap={false} style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.wash, borderRadius: 6,
      paddingVertical: 8, paddingHorizontal: 10, marginBottom: 5 }}>
      <View style={{ width: 36, height: 22, borderRadius: 3, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 9 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontSize: 10 }}>{desc}</Text>
        {note && <Text style={{ fontSize: 7.5, color: C.mute, marginTop: 1.5 }}>{note}</Text>}
      </View>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

export function Steps({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} wrap={false} style={{ flexDirection: "row", marginBottom: 6 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", marginRight: 8 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 7.5, fontFamily: "Helvetica-Bold" }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.5, color: C.ink2 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Simple table for registers (expenses, trips, income entries). Widths are flex weights. */
export function Table({ cols, rows }: { cols: { h: string; w: number; right?: boolean }[]; rows: string[][] }) {
  const cell = (t: string, c: (typeof cols)[number], key: number, bold = false) => (
    <Text key={key} style={{ flexGrow: c.w, flexShrink: 1, flexBasis: 0, textAlign: c.right ? "right" : "left", paddingHorizontal: 4,
      fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }}>{t}</Text>
  );
  return (
    <View style={{ fontSize: 7.8 }}>
      <View style={{ flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingVertical: 5, color: C.mute }}>
        {cols.map((c, i) => cell(c.h, c, i, true))}
      </View>
      {rows.length === 0 && <Text style={{ padding: 6, color: C.mute }}>No records.</Text>}
      {rows.map((r, i) => (
        <View key={i} wrap={false} style={{ flexDirection: "row", paddingVertical: 4.5, backgroundColor: i % 2 ? "#FFFFFF" : "#FAFAFA",
          borderBottomWidth: 0.4, borderBottomColor: C.line }}>
          {r.map((t, j) => cell(t, cols[j], j))}
        </View>
      ))}
    </View>
  );
}

/** Cover art: a rideshare car seen from above, pulled up at a crossroads with yellow kerb lines. */
export function CarIllustration() {
  return (
    <Svg width={170} height={170} viewBox="0 0 170 170">
      <Circle cx="85" cy="85" r="85" fill={C.kerbSoft} />
      {/* crossroads */}
      <Rect x="61" y="8" width="48" height="154" fill="#FFFFFF" />
      <Rect x="8" y="61" width="154" height="48" fill="#FFFFFF" />
      {/* kerb lines along the road edges */}
      <Rect x="57" y="16" width="3" height="40" rx="1.5" fill={C.kerb} />
      <Rect x="110" y="16" width="3" height="40" rx="1.5" fill={C.kerb} />
      <Rect x="57" y="114" width="3" height="40" rx="1.5" fill={C.kerb} />
      <Rect x="110" y="114" width="3" height="40" rx="1.5" fill={C.kerb} />
      <Rect x="16" y="57" width="40" height="3" rx="1.5" fill={C.kerb} />
      <Rect x="114" y="57" width="40" height="3" rx="1.5" fill={C.kerb} />
      <Rect x="16" y="110" width="40" height="3" rx="1.5" fill={C.kerb} />
      <Rect x="114" y="110" width="40" height="3" rx="1.5" fill={C.kerb} />
      {/* car shadow + body */}
      <Rect x="66" y="45" width="44" height="86" rx="15" fill="#E8DCC0" />
      <Rect x="63" y="41" width="44" height="86" rx="15" fill={C.ink} />
      {/* mirrors */}
      <Rect x="58" y="66" width="6" height="8" rx="2" fill={C.ink} />
      <Rect x="106" y="66" width="6" height="8" rx="2" fill={C.ink} />
      {/* headlights + tail lights */}
      <Rect x="67" y="43" width="10" height="4" rx="2" fill={C.kerb} />
      <Rect x="93" y="43" width="10" height="4" rx="2" fill={C.kerb} />
      <Rect x="68" y="122" width="9" height="3" rx="1.5" fill="#E2554A" />
      <Rect x="93" y="122" width="9" height="3" rx="1.5" fill="#E2554A" />
      {/* windscreen, roof, rear window */}
      <Path d="M68 61 L102 61 L98 75 L72 75 Z" fill="#FFFFFF" />
      <Rect x="72" y="78" width="26" height="30" rx="6" fill="#2B2B2B" />
      <Path d="M71 111 L99 111 L102 119 L68 119 Z" fill="#FFFFFF" />
      {/* rideshare badge on the roof */}
      <Circle cx="85" cy="93" r="9" fill={C.kerb} />
      <Path d="M80.5 93.5 L84 97 L90 89.5" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Cover page body: illustration + title, headline split, stats band. */
export function Cover({ fyLabel, title, greeting, intro, left, headline, stats }: {
  fyLabel: string; title: string; greeting: string; intro: string;
  left: [string, string][]; headline: { label: string; value: string; tone?: "pos" | "neg" };
  stats: { value: string; label: string }[];
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}>
        <CarIllustration />
        <View style={{ flex: 1, marginLeft: 28 }}>
          <Text style={{ fontSize: 12, marginBottom: 6 }}>{fyLabel}</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 30, letterSpacing: -0.8, marginBottom: 12 }}>{title}</Text>
          <Text style={{ fontSize: 15, lineHeight: 1.35, marginBottom: 10 }}>{greeting}</Text>
          <Text style={{ fontSize: 9.5, color: C.mute, lineHeight: 1.5 }}>{intro}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 70, marginBottom: 60 }}>
        <View style={{ flex: 1, paddingRight: 22, borderRightWidth: 0.8, borderRightColor: C.line }}>
          {left.map(([k, v], i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "flex-end", marginVertical: 6 }}>
              <Text style={{ fontSize: 10.5, color: C.ink2, marginRight: 12 }}>{k}</Text>
              <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", width: 92 }}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, paddingLeft: 26 }}>
          <Text style={{ fontSize: 15, marginBottom: 6 }}>{headline.label}</Text>
          <Text style={{ fontSize: 32, letterSpacing: -0.8, color: headline.tone === "pos" ? C.pos : C.ink }}>{headline.value}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", backgroundColor: C.wash, marginHorizontal: -40, paddingVertical: 22 }}>
        {stats.map((st, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Mark size={14} />
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, marginTop: 6 }}>{st.value}</Text>
            <Text style={{ fontSize: 9, color: C.ink2, marginTop: 3 }}>{st.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
