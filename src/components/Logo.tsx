export const BRAND_A = process.env.NEXT_PUBLIC_BRAND_A || "Duty";
export const BRAND_B = process.env.NEXT_PUBLIC_BRAND_B || "Track";

export default function Logo({ className = "text-3xl", dark = true }: { className?: string; dark?: boolean }) {
  return (
    <div className={`font-extrabold tracking-tight ${className} ${dark ? "text-white" : "text-slate-900"}`}>
      {BRAND_A}
      <span className="text-brand">{BRAND_B}</span>
    </div>
  );
}
