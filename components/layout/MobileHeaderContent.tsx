"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import Logo from "@/components/Logo";

export function MobileHeaderContent() {
  const { isMobile } = useSidebar();

  // This header should only be rendered on mobile.
  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background p-4 flex items-center border-b h-14 lg:hidden">
      <SidebarTrigger className="p-2 rounded-md hover:bg-muted flex items-center justify-center">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>
      <div className="ml-4">
        <Logo />
      </div>
    </div>
  );
}
