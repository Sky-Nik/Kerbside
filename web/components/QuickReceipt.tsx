"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { todayAu } from "@/lib/tax";
import { ExpenseForm } from "./ExpenseForm";
import { Icon } from "./Icon";

/** Phone-only floating "Snap receipt" button: opens the camera, then a sheet that reads the receipt and saves it. */
export function QuickReceipt() {
  const path = usePathname();
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  if (path.startsWith("/reports") || path.startsWith("/welcome")) return null;
  const today = todayAu();
  return (
    <>
      <label className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 cursor-pointer items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-[15px] font-bold text-white shadow-lg shadow-black/30 active:scale-95 lg:hidden">
        <Icon name="receipt" size={20} />Snap receipt
        <input type="file" accept="image/*" capture="environment" className="sr-only"
          onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) { setSaved(false); setFile(f); } }} />
      </label>
      {saved && (
        <div className="fixed inset-x-4 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl bg-ink p-4 text-sm font-medium text-white shadow-lg lg:hidden" role="status">
          Receipt saved to Expenses.
        </div>
      )}
      {file && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 lg:hidden" onClick={() => setFile(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="h2">New receipt</h2>
              <button type="button" className="btn-ghost" onClick={() => setFile(null)}>Cancel</button>
            </div>
            <ExpenseForm key={file.name + file.lastModified} min="2000-01-01" max={today} defaultDate={today} initialFile={file}
              onSaved={() => { setFile(null); setSaved(true); setTimeout(() => setSaved(false), 3500); }} />
          </div>
        </div>
      )}
    </>
  );
}
