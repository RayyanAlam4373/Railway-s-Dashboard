"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  created: "Record created.",
  updated: "Record updated.",
  deleted: "Record deleted.",
};

export function FlashToast() {
  const params = useSearchParams();

  useEffect(() => {
    for (const key of Object.keys(MESSAGES)) {
      if (params.get(key)) {
        toast.success(MESSAGES[key]);
      }
    }
    // Intentionally only run on first mount per page render so back-navigation
    // doesn't keep firing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
