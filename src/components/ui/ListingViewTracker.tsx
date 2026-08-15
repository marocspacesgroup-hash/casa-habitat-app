"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function ListingViewTracker({ reference }: { reference: string }) {
  useEffect(() => {
    trackEvent("listing_view", { reference });
  }, [reference]);

  return null;
}
