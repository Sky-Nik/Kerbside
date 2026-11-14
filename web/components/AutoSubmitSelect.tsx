"use client";

export function AutoSubmitSelect(props: {
  name: string; defaultValue: string; options: { value: string; label: string }[]; "aria-label"?: string;
}) {
  return (
    <select name={props.name} defaultValue={props.defaultValue} aria-label={props["aria-label"]}
      className="h-9 cursor-pointer appearance-none rounded-full bg-white/10 px-4 text-sm font-medium text-white outline-none hover:bg-white/20 focus:ring-2 focus:ring-white [&>option]:text-black"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
