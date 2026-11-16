import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/legal";

export const metadata = { title: "Privacy policy · Kerbside" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl py-10 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mb-1 [&_ul]:list-disc [&_ul]:pl-5">
      <p className="eyebrow">Last updated {LEGAL_UPDATED}</p>
      <h1 className="h1 mb-4">Privacy policy</h1>
      <p>Kerbside helps rideshare and delivery drivers keep their tax records. This policy explains what we collect, why, where it’s kept and how to delete it. We follow the Australian Privacy Principles.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your email address, and your name if you add it or sign in with Google.</li>
        <li><b>Business details you enter:</b> ABN, income, expenses, logbook trips, odometer readings, car details and settings.</li>
        <li><b>Files you upload:</b> receipt photos, tax summaries and lodged tax returns. A lodged tax return can include your tax file number (TFN), date of birth and address. Kerbside only reads the tax figures from it; the file itself is stored so you can keep it.</li>
      </ul>
      <p>We don’t collect your location, contacts or anything from the driver apps directly.</p>

      <h2>How we use it</h2>
      <p>Only to run Kerbside for you: working out your BAS, tax summary, estimates and reports. We don’t sell your information, show you ads or share it with platforms, employers or the ATO. Nothing is lodged on your behalf.</p>

      <h2>Where it’s stored</h2>
      <ul>
        <li>Your data and files are stored with Supabase in Sydney, Australia. Files are in private storage that only your account can open.</li>
        <li>The app is hosted by Vercel. Sign-in with Google is handled by Google.</li>
        <li>We use Google Tag Manager (Google) to measure how people find and use the site, such as page visits. It may set cookies in your browser. Your tax records, receipts and figures are not sent to it.</li>
        <li>Receipt scanning runs on your own device; receipt images aren’t sent anywhere to be read.</li>
      </ul>
      <p>Each account can only see its own records. Kerbside staff don’t look at your records except to fix a problem you ask us to help with.</p>

      <h2>How long we keep it</h2>
      <p>Until you delete it. The ATO asks you to keep tax records for 5 years, so we keep them unless you remove them. You can delete individual records and files at any time.</p>

      <h2>Your choices</h2>
      <ul>
        <li><b>Download everything:</b> Settings → Your data → Export everything.</li>
        <li><b>Delete your account:</b> Settings → Your data → Delete my account. This permanently removes your records and files.</li>
        <li><b>Access or correction:</b> everything we hold is visible and editable in the app.</li>
      </ul>

      <h2>Contact</h2>
      <p>Questions or privacy complaints: {LEGAL_CONTACT}. If you’re not satisfied with our response, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).</p>
    </main>
  );
}
