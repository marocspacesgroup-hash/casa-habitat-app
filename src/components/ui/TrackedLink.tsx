"use client";

import { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

export default function TrackedLink({
  href,
  event,
  params,
  className,
  children,
  target,
  rel,
}: {
  href: string;
  event: "whatsapp_click" | "phone_click" | "owner_cta_click";
  params?: Record<string, string | number | boolean | undefined>;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={() => trackEvent(event, params)}
    >
      {children}
    </a>
  );
}
