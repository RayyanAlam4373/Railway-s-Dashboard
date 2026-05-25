import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { countActiveAlerts } from "@/lib/alerts/queries";

export async function AlertBell() {
  let count = 0;
  try {
    count = await countActiveAlerts();
  } catch {
    // Bell is a side-element; never let it break the layout.
    count = 0;
  }

  return (
    <Link
      href="/alerts"
      className="relative inline-flex h-7 items-center rounded-md border border-transparent px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Alerts (${count} active)`}
    >
      <BellIcon />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  );
}

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
