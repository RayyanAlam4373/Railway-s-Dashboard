import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  trend?: "positive" | "negative" | "neutral";
};

export function KpiCard({ label, value, hint, trend = "neutral" }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "truncate font-mono text-xl tabular-nums tracking-tight",
            "[font-variant-numeric:tabular-nums]",
            trend === "positive" && "text-emerald-600 dark:text-emerald-400",
            trend === "negative" && "text-destructive",
          )}
          title={value}
        >
          <span className="whitespace-nowrap">{value}</span>
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {hint}
        </CardContent>
      )}
    </Card>
  );
}
