import type { Metadata } from "next";
import "./globals.css";

const brand = (process.env.NEXT_PUBLIC_BRAND_A || "Duty") + (process.env.NEXT_PUBLIC_BRAND_B || "Track");

export const metadata: Metadata = { title: { default: brand, template: `%s • ${brand}` }, description: "Attendance tracking" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
