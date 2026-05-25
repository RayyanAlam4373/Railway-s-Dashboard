"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acknowledgeAlertAction } from "./actions";

export function AckButton({
  alertId,
  canAck,
}: {
  alertId: number;
  canAck: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canAck) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await acknowledgeAlertAction(alertId);
            toast.success("Acknowledged.");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to acknowledge.",
            );
          }
        });
      }}
    >
      {pending ? "…" : "Acknowledge"}
    </Button>
  );
}
