"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachReceipt } from "./receipt";

export function AttachReceipt({ expenseId, replace }: { expenseId: string; replace?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");
  return (
    <label className={`cursor-pointer text-xs ${replace ? "text-slate-500" : "font-medium text-amber-700"} underline`}>
      {state === "busy" ? "Uploading…" : replace ? "Replace" : "Attach"}
      <input type="file" accept="image/*,application/pdf" className="hidden" disabled={state === "busy"}
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0];
          if (!file) return;
          setState("busy");
          try {
            await attachReceipt(expenseId, file);
            setState("idle");
            router.refresh();
          } catch (err) {
            setState((err as Error).message);
          }
        }} />
      {state !== "idle" && state !== "busy" && <span className="block text-red-700 no-underline">{state}</span>}
    </label>
  );
}
