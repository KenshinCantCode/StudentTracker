/* eslint-disable @next/next/no-img-element */
export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export default function Avatar({
  name,
  src,
  className = "h-9 w-9",
  rounded = "rounded-full",
}: {
  name: string;
  src?: string | null;
  className?: string;
  rounded?: string;
}) {
  if (src) return <img src={src} alt="" className={`${className} ${rounded} shrink-0 object-cover`} />;
  return (
    <div className={`${className} ${rounded} flex shrink-0 items-center justify-center bg-brand text-xs font-bold text-white`}>
      {initials(name)}
    </div>
  );
}
