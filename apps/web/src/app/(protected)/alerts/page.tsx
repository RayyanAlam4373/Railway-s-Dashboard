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
  const alerts = await listAlerts(scope);

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

      {alerts.length === 0 ? (
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
