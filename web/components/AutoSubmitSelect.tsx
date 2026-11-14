"use client";

export function AutoSubmitSelect(props: {
  name: string; defaultValue: string; options: { value: string; label: string }[]; "aria-label"?: string;
}) {
  return (
    <select className="inp" name={props.name} defaultValue={props.defaultValue} aria-label={props["aria-label"]}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
