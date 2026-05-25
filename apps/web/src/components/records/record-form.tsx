"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/datasets/registry";
import type { ClientDatasetConfig, FieldDef, LookupOption, LookupTable } from "@/lib/datasets/types";
import type { ActionResult } from "@/app/(protected)/records/actions";

type Props = {
  dataset: ClientDatasetConfig;
  lookups: Partial<Record<LookupTable, LookupOption[]>>;
  initial?: Record<string, unknown>;
  action: (
    prev: ActionResult | undefined,
    formData: FormData,
  ) => Promise<ActionResult>;
  submitLabel: string;
};

export function RecordForm({ dataset, lookups, initial, action, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {dataset.fields.map((f) => (
          <FieldInput
            key={f.key}
            field={f}
            lookups={lookups}
            initial={initial?.[f.key]}
            error={state && !state.ok ? state.fieldErrors?.[f.key]?.[0] : undefined}
          />
        ))}
      </div>

      {state && !state.ok && !state.fieldErrors && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  lookups,
  initial,
  error,
}: {
  field: FieldDef;
  lookups: Partial<Record<LookupTable, LookupOption[]>>;
  initial: unknown;
  error: string | undefined;
}) {
  const defaultValue =
    initial === null || initial === undefined ? "" : String(initial);

  let control: React.ReactNode = null;

  if (field.kind === "lookup" && field.lookup) {
    const options = lookups[field.lookup.table] ?? [];
    control = (
      <Select name={field.key} defaultValue={defaultValue || undefined}>
        <SelectTrigger id={field.key}>
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (field.kind === "month") {
    control = (
      <Select name={field.key} defaultValue={defaultValue || undefined}>
        <SelectTrigger id={field.key}>
          <SelectValue placeholder="Select month…" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, idx) => (
            <SelectItem key={idx} value={String(idx + 1)}>
              {name} ({idx + 1})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (field.kind === "year") {
    control = (
      <Input
        id={field.key}
        name={field.key}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        defaultValue={defaultValue}
        required
      />
    );
  } else if (field.kind === "integer") {
    control = (
      <Input
        id={field.key}
        name={field.key}
        type="number"
        inputMode="numeric"
        min={field.min}
        step={1}
        defaultValue={defaultValue}
        required={!field.nullable}
      />
    );
  } else if (field.kind === "decimal") {
    control = (
      <Input
        id={field.key}
        name={field.key}
        type="number"
        inputMode="decimal"
        min={field.min}
        step={field.step ?? "any"}
        defaultValue={defaultValue}
        required={!field.nullable}
        placeholder={field.nullable ? "(leave blank for none)" : undefined}
      />
    );
  } else if (field.kind === "fiscal_year") {
    control = (
      <Input
        id={field.key}
        name={field.key}
        type="text"
        placeholder="2025-2026"
        defaultValue={defaultValue}
        required
        pattern="\d{4}-\d{4}"
      />
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.nullable && (
          <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
        )}
      </Label>
      {control}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
