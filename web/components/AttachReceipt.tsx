"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachReceipt } from "./receipt";
import { Icon } from "./Icon";

export function AttachReceipt({ expenseId, replace }: { expenseId: string; replace?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");
  return (
    <label className={`pill cursor-pointer py-1 transition ${replace ? "text-mute hover:bg-wash" : "bg-[#fff8e6] text-ink ring-1 ring-warn hover:bg-warn/40"}`}
      title={state !== "idle" && state !== "busy" ? state : undefined}>
      {!replace && <Icon name="upload" size={12} />}
      {state === "busy" ? "Uploading…" : state !== "idle" ? "Retry" : replace ? "Replace" : "Attach receipt"}
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
            alert((err as Error).message);
          }
        }} />
    </label>
  );
}
