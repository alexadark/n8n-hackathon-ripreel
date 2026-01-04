"use client";

import { ReactNode } from "react";

interface LegalLayoutProps {
  children: ReactNode;
  tocSidebar: ReactNode;
}

export default function LegalLayout({
  children,
  tocSidebar,
}: LegalLayoutProps) {
  return (
    <div className="lg:flex lg:gap-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="lg:flex-1">{children}</div>
      <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
        {tocSidebar}
      </div>
    </div>
  );
}
