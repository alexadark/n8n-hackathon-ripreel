/**
 * Studio Layout Route
 *
 * This is the parent layout for all studio pages. It renders the header with
 * project info and the sidebar navigation, with an Outlet for nested routes.
 *
 * Route: /projects/:id/studio/*
 */

import * as React from "react";
import { Outlet, Link, useLocation, useNavigation } from "react-router";
import { db } from "@/lib/drizzle/db.server";
import { projects } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Home, FolderOpen, Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Route } from "./+types/projects.$id.studio";
import type { ShouldRevalidateFunctionArgs } from "react-router";

// =============================================================================
// Should Revalidate - Only revalidate on actions, not on navigation
// =============================================================================

export function shouldRevalidate({ formAction, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (formAction) {
    return defaultShouldRevalidate;
  }
  return false;
}

// =============================================================================
// Loader
// =============================================================================

export async function loader({ params }: Route.LoaderArgs) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.id))
    .limit(1);

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  return { project };
}

// =============================================================================
// Meta
// =============================================================================

export function meta({ data }: Route.MetaArgs) {
  if (!data?.project) {
    return [
      { title: "Project Not Found | ripreel.io" },
      { name: "description", content: "The requested project was not found." },
    ];
  }
  return [
    { title: `${data.project.title} | Studio | ripreel.io` },
    {
      name: "description",
      content: `Production studio for ${data.project.title}`,
    },
  ];
}

// =============================================================================
// Studio Sidebar Component (inline for React Router)
// =============================================================================

import {
  BookOpen,
  Film,
  Image as ImageIcon,
  Video,
  Clock,
  Download,
  Settings,
} from "lucide-react";

interface StudioSidebarProps {
  projectId: string;
  onLinkClick?: () => void;
}

function StudioSidebar({ projectId, onLinkClick }: StudioSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const tabs = [
    {
      name: "Bible",
      href: `/projects/${projectId}/studio/bible`,
      icon: BookOpen,
      description: "Character & location review",
    },
    {
      name: "Scenes",
      href: `/projects/${projectId}/studio/scenes`,
      icon: Film,
      description: "Scene validation & approval",
    },
    {
      name: "Images",
      href: `/projects/${projectId}/studio/images`,
      icon: ImageIcon,
      description: "Two-phase image generation",
    },
    {
      name: "Video",
      href: `/projects/${projectId}/studio/video`,
      icon: Video,
      description: "Video generation",
    },
    {
      name: "Timeline",
      href: `/projects/${projectId}/studio/timeline`,
      icon: Clock,
      description: "Sequence & preview",
    },
    {
      name: "Export",
      href: `/projects/${projectId}/studio/export`,
      icon: Download,
      description: "Final render & download",
    },
  ];

  const settingsLink = {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "API keys & configuration",
  };

  const isActive = (href: string): boolean => {
    if (href === `/projects/${projectId}/studio`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-[#333] bg-[#0a0a0b] min-h-[calc(100vh-140px)] flex flex-col">
      <div className="p-6 flex-1">
        <h2 className="font-oswald text-lg uppercase text-[#f5c518] mb-4 tracking-wider">
          Production Studio
        </h2>

        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);

            return (
              <Link
                key={tab.href}
                to={tab.href}
                prefetch="render"
                onClick={onLinkClick}
                className={`
                  block p-3 rounded transition-colors
                  ${
                    active
                      ? "bg-[#f5c518] text-black"
                      : "text-[#888] hover:bg-[#1c1c1f] hover:text-white"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <div>
                    <div
                      className={`font-oswald uppercase text-sm ${active ? "text-black" : ""}`}
                    >
                      {tab.name}
                    </div>
                    <div
                      className={`font-courier text-xs ${active ? "text-black/70" : "text-[#666]"}`}
                    >
                      {tab.description}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Settings link at bottom */}
      <div className="p-6 border-t border-[#333]">
        <Link
          to={settingsLink.href}
          onClick={onLinkClick}
          className="block p-3 rounded transition-colors text-[#888] hover:bg-[#1c1c1f] hover:text-white"
        >
          <div className="flex items-center gap-3">
            <settingsLink.icon size={18} />
            <div>
              <div className="font-oswald uppercase text-sm">
                {settingsLink.name}
              </div>
              <div className="font-courier text-xs text-[#666]">
                {settingsLink.description}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

// =============================================================================
// Component
// =============================================================================

// =============================================================================
// Navigation Loading Skeleton - Shows during client-side navigation
// =============================================================================

function NavigationLoadingSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Skeleton for instructions */}
      <div className="mb-8 p-6 bg-[#1c1c1f] border-l-4 border-[#f5c518] animate-pulse">
        <div className="h-6 w-64 bg-[#333] rounded mb-2" />
        <div className="h-4 w-full bg-[#333] rounded" />
      </div>

      {/* Skeleton for stats bar */}
      <div className="flex items-center gap-4 p-4 bg-[#1c1c1f] border border-[#333] rounded mb-6">
        <div className="h-4 w-32 bg-[#333] rounded" />
        <div className="h-4 w-32 bg-[#333] rounded" />
        <div className="h-4 w-24 bg-[#333] rounded" />
      </div>

      {/* Skeleton for content cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-[#1c1c1f] border border-[#333] rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function StudioLayout({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData;
  const navigation = useNavigation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Show loading skeleton when navigating to a new route
  const isNavigating = navigation.state === "loading";

  const closeSidebar = React.useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-[#333] py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left side - Navigation and Logo */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {/* Mobile Sidebar Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-[#888] hover:text-[#f5c518] hover:bg-[#1c1c1f]"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#888] hover:text-[#f5c518] hover:bg-[#1c1c1f]"
                  >
                    <ArrowLeft size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="bg-[#1c1c1f] border-[#333] text-white"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      to="/"
                      className="flex items-center gap-2 cursor-pointer hover:bg-[#333] focus:bg-[#333]"
                    >
                      <Home size={16} />
                      <span className="font-courier">Home</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/projects"
                      className="flex items-center gap-2 cursor-pointer hover:bg-[#333] focus:bg-[#333]"
                    >
                      <FolderOpen size={16} />
                      <span className="font-courier">All Projects</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to="/"
                className="font-oswald text-xl font-bold tracking-widest hidden sm:block"
              >
                ripreel<span className="text-[#f5c518]">.io</span>
              </Link>
            </div>

            {/* Center - Project Info */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 justify-center">
              <h1 className="font-oswald text-sm md:text-lg uppercase text-white truncate">
                {project.title}
              </h1>
              <Badge className="bg-[#f5c518] text-black font-oswald uppercase text-xs shrink-0 hidden sm:inline-flex">
                {project.visual_style}
              </Badge>
              <Badge className="bg-[#1c1c1f] text-[#888] border border-[#333] font-courier text-xs shrink-0 hidden md:inline-flex">
                {project.status.replace("_", " ")}
              </Badge>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <DeleteProjectButton
                projectId={project.id}
                projectTitle={project.title}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-[#0a0a0b] border-r border-[#333]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Studio navigation and settings.</SheetDescription>
          </SheetHeader>
          <StudioSidebar projectId={project.id} onLinkClick={closeSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main Content with Sidebar */}
      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <StudioSidebar projectId={project.id} />
        </div>
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-73px)]">
          {isNavigating ? <NavigationLoadingSkeleton /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// Error Boundary
// =============================================================================

import { isRouteErrorResponse, useRouteError, Link as RouterLink } from "react-router";
import { AlertTriangle } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="font-oswald text-4xl text-[#f5c518] mb-4">
              PROJECT NOT FOUND
            </h1>
            <p className="font-courier text-[#888] mb-8">
              The project you are looking for does not exist or has been
              deleted.
            </p>
            <RouterLink
              to="/projects"
              className="inline-block bg-[#f5c518] text-black px-6 py-3 font-oswald uppercase tracking-wider hover:bg-white transition-colors"
            >
              Back to Projects
            </RouterLink>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="text-center p-8 max-w-lg">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
        <h1 className="font-oswald text-2xl text-white mb-4">
          SOMETHING WENT WRONG
        </h1>
        <p className="font-courier text-[#888] mb-8">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred while loading the studio."}
        </p>
        <RouterLink
          to="/projects"
          className="inline-block bg-[#f5c518] text-black px-6 py-3 font-oswald uppercase tracking-wider hover:bg-white transition-colors"
        >
          Back to Projects
        </RouterLink>
      </div>
    </div>
  );
}

// =============================================================================
// Hydrate Fallback
// =============================================================================

export function HydrateFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#f5c518] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-courier text-[#888]">Loading studio...</p>
      </div>
    </div>
  );
}
