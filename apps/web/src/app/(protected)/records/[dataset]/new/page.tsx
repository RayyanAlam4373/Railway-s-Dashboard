import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecordForm } from "@/components/records/record-form";
import { createRecordAction } from "../../actions";
import { canWriteFacts, requireSession } from "@/lib/auth/session";
import { loadLookups } from "@/lib/datasets/queries";
import { getDataset } from "@/lib/datasets/registry";
import { toClientDataset } from "@/lib/datasets/types";

type PageProps = { params: Promise<{ dataset: string }> };

export default async function NewRecordPage({ params }: PageProps) {
  const session = await requireSession();
  const { dataset: slug } = await params;
  const dataset = getDataset(slug);
  if (!dataset) notFound();
  if (!canWriteFacts(session.role)) redirect(`/records/${slug}`);

  const lookups = await loadLookups(dataset.lookups);
  const action = createRecordAction.bind(null, slug);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/records/${slug}`}
        className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New {dataset.title.toLowerCase()} record</CardTitle>
          <CardDescription>
            Fill in every required field. Records are validated server-side
            before being written.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordForm
            dataset={toClientDataset(dataset)}
            lookups={lookups}
            action={action}
            submitLabel="Create record"
          />
        </CardContent>
      </Card>
    </div>
  );
}
