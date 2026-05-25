import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DATASET_LIST } from "@/lib/datasets/registry";

export default function RecordsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit and review records across the six freight datasets. Pick
          one to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DATASET_LIST.map((d) => (
          <Link
            key={d.slug}
            href={`/records/${d.slug}`}
            className="group rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:border-primary/60">
              <CardHeader>
                <CardTitle className="text-base">{d.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {d.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {d.fields.length} columns
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
