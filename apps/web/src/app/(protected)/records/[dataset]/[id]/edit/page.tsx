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
import { updateRecordAction } from "../../../actions";
import { canWriteFacts, requireSession } from "@/lib/auth/session";
import { getRecord, loadLookups } from "@/lib/datasets/queries";
import { getDataset } from "@/lib/datasets/registry";
import { toClientDataset } from "@/lib/datasets/types";

type PageProps = {
  params: Promise<{ dataset: string; id: string }>;
};

export default async function EditRecordPage({ params }: PageProps) {
  const session = await requireSession();
  const { dataset: slug, id } = await params;
  const dataset = getDataset(slug);
  if (!dataset) notFound();
  if (!canWriteFacts(session.role)) redirect(`/records/${slug}`);

  const [record, lookups] = await Promise.all([
    getRecord(dataset, id),
    loadLookups(dataset.lookups),
  ]);
  if (!record) notFound();

  const action = updateRecordAction.bind(null, slug, id);

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
          <CardTitle>Edit {dataset.title.toLowerCase()} record</CardTitle>
          <CardDescription>Update fields and save your changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecordForm
            dataset={toClientDataset(dataset)}
            lookups={lookups}
            initial={record}
            action={action}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
