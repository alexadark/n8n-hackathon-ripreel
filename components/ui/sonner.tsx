"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";
import { cn } from "@/lib/utils";

const Toaster = ({ ...props }: ToasterProps) => {
  // Demo mode uses dark theme only
  return (
    <Sonner
      theme="dark"
      className={cn(
        "toaster group",
        "[--normal-bg:var(--popover)] [--normal-text:var(--popover-foreground)] [--normal-border:var(--border)]"
      )}
      {...props}
    />
  );
};

export { Toaster };
