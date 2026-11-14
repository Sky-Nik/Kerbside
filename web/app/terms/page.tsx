import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/legal";

export const metadata = { title: "Terms · Kerbside" };

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl py-10 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mb-1 [&_ul]:list-disc [&_ul]:pl-5">
      <p className="eyebrow">Last updated {LEGAL_UPDATED}</p>
      <h1 className="h1 mb-4">Terms of use</h1>

      <h2>What Kerbside is</h2>
      <p>A record-keeping tool for rideshare and delivery drivers in Australia. It organises the information you enter and lays it out the way the ATO asks for it.</p>

      <h2>Not tax advice</h2>
      <p>Kerbside isn’t a registered tax agent or BAS agent and doesn’t give tax, legal or financial advice. Figures, estimates and reports are general information based on the ATO’s published rules and on what you enter. You’re responsible for checking them and for what you lodge. If you’re unsure, talk to a registered tax agent or the ATO.</p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your sign-in details private. You’re responsible for activity in your account.</li>
        <li>Only upload documents you’re entitled to keep, and keep your own copies of important records.</li>
        <li>Don’t misuse the service, try to access other people’s data or interfere with how it runs.</li>
      </ul>

      <h2>Your data</h2>
      <p>Your records belong to you. You can export or delete them at any time (see the Privacy policy).</p>

      <h2>Availability and changes</h2>
      <p>We work to keep Kerbside running and accurate but can’t promise it will always be available or error-free. Features may change. If we change these terms we’ll update the date above.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, Kerbside isn’t liable for losses from relying on its figures, including penalties or interest from the ATO. Nothing here limits rights you have under the Australian Consumer Law.</p>

      <h2>Contact</h2>
      <p>{LEGAL_CONTACT}</p>
    </main>
  );
}
