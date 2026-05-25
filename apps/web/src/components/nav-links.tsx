"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboards/commodity", label: "Commodity" },
  { href: "/dashboards/container", label: "Container" },
  { href: "/dashboards/coal", label: "Coal" },
  { href: "/dashboards/customers", label: "Customers" },
  { href: "/dashboards/comparative", label: "Comparative" },
  { href: "/records", label: "Records" },
  { href: "/alerts", label: "Alerts" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden gap-1 md:flex">
      {LINKS.map((l) => {
        const active =
          l.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
