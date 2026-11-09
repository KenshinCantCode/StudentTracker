"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean };

export function NavLinks({ items, mobile = false }: { items: NavItem[]; mobile?: boolean }) {
  const path = usePathname();
  return (
    <>
      {items.map((i) => {
        const on = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold ${
              on ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-slate-100"
            } ${mobile ? "shrink-0" : ""}`}
          >
            <span className="w-4 text-center">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </>
  );
}

/** <select> inside a GET form that submits on change */
export function AutoSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

/** Submit button that asks for confirmation first */
export function ConfirmButton({ message, children, ...rest }: { message: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Prompts for a new password and submits it via the surrounding form's hidden "new" input */
export function ResetPasswordButton({ name }: { name: string }) {
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={(e) => {
        const form = e.currentTarget.form!;
        const p = prompt(`New password for ${name} (min 6 characters):`);
        if (!p) return e.preventDefault();
        (form.elements.namedItem("new") as HTMLInputElement).value = p;
      }}
    >
      Reset PW
    </button>
  );
}
