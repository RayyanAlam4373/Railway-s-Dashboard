import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { canWriteFacts, requireSession } from "@/lib/auth/session";
import { listAlerts } from "@/lib/alerts/queries";
import {
  ALERT_TYPE_LABEL,
  type AlertRow,
  type AlertSeverity,
} from "@/lib/alerts/types";
import { AckButton } from "./ack-button";
import { RefreshAlertsButton } from "./refresh-button";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlertsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const sp = await searchParams;
  const scope = sp.scope === "all" ? "all" : "active";

  let alerts: AlertRow[] = [];
  let loadError: { message: string; hint: string | null } | null = null;
  try {
    alerts = await listAlerts(scope);
  } catch (err) {
    console.error("[alerts] failed to load:", err);
    const e = err as { message?: string; code?: string; hint?: string };
    const message = e?.message ?? "Unknown error loading alerts.";
    const missingTable =
      e?.code === "42P01" || /relation .*alerts.* does not exist/i.test(message);
    loadError = {
      message,
      hint: missingTable
        ? "The alerts table is missing. Run supabase/migrations/0005_audit_log_insert_policy.sql, 0006_fix_rls_recursion.sql, and 0007_alerts.sql in the Supabase SQL Editor."
        : (e?.hint ?? null),
    };
  }

  const canAck = canWriteFacts(session.role);
  const grouped = groupByType(alerts);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Operational and revenue-risk signals computed from the latest
            data. Thresholds live in <code>src/lib/alerts/types.ts</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeTabs current={scope} />
          <RefreshAlertsButton canRefresh={canAck} />
        </div>
      </div>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Couldn&apos;t load alerts</CardTitle>
            <CardDescription>
              The server hit an error querying the alerts table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-mono text-xs text-destructive">
              {loadError.message}
            </p>
            {loadError.hint && (
              <p className="text-muted-foreground">{loadError.hint}</p>
            )}
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All clear</CardTitle>
            <CardDescription>
              No {scope === "active" ? "active" : ""} alerts.{" "}
              {scope === "active"
                ? "Click Refresh alerts to re-evaluate against the latest data."
                : "Nothing has been raised yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, rows]) => (
            <section key={type} className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {ALERT_TYPE_LABEL[type as keyof typeof ALERT_TYPE_LABEL]}
              </h2>
              {rows.map((a) => (
                <AlertCard key={a.id} alert={a} canAck={canAck} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeTabs({ current }: { current: "active" | "all" }) {
  const linkClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: "outline", size: "sm" }),
      active && "bg-muted text-foreground",
    );
  return (
    <div className="flex gap-1">
      <Link href="?scope=active" className={linkClass(current === "active")}>
        Active
      </Link>
      <Link href="?scope=all" className={linkClass(current === "all")}>
        All
      </Link>
    </div>
  );
}

function AlertCard({ alert, canAck }: { alert: AlertRow; canAck: boolean }) {
  const variant = severityToVariant(alert.severity);
  const acknowledged = alert.acknowledged_at !== null;

  return (
    <Alert variant={variant}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <AlertTitle className="flex items-center gap-2">
            <span>{alert.title}</span>
            <Badge variant="secondary" className="text-[10px] uppercase">
              {alert.severity}
            </Badge>
            {acknowledged && (
              <Badge variant="outline" className="text-[10px]">
                Acknowledged
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
          <div className="text-xs text-muted-foreground">
            Raised {new Date(alert.created_at).toLocaleString()} ·{" "}
            <code className="text-[11px]">{alert.fingerprint}</code>
          </div>
        </div>
        {!acknowledged && <AckButton alertId={alert.id} canAck={canAck} />}
      </div>
    </Alert>
  );
}

function severityToVariant(s: AlertSeverity): "default" | "destructive" {
  return s === "critical" ? "destructive" : "default";
}

function groupByType(alerts: AlertRow[]): Record<string, AlertRow[]> {
  const out: Record<string, AlertRow[]> = {};
  for (const a of alerts) {
    (out[a.type] ??= []).push(a);
  }
  return out;
}
