import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { Plus, Film } from "lucide-react";
import { db } from "@/lib/drizzle/db.server";
import { projects } from "@/lib/drizzle/schema";
import { desc, ne } from "drizzle-orm";
import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/projects/empty-state";
import type { Route } from "./+types/projects._index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Projects - RipReel" },
    { name: "description", content: "Manage your active film productions." },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  // Fetch all projects (excluding failed ones)
  const allProjects = await db
    .select()
    .from(projects)
    .where(ne(projects.status, "failed"))
    .orderBy(desc(projects.updated_at));

  return { projects: allProjects };
}

export default function ProjectsPage({ loaderData }: Route.ComponentProps) {
  const { projects: allProjects } = loaderData;

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-[#333] py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="font-oswald text-2xl font-bold tracking-widest hover:text-[#f5c518] transition-colors"
            >
              ripreel<span className="text-[#f5c518]">.io</span>
            </Link>

            {/* New Project Button */}
            <Link
              to="/projects/new"
              className="inline-flex items-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-widest px-6 py-3 transition-colors"
            >
              <Plus size={20} />
              New Project
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Film className="text-[#f5c518]" size={32} />
            <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight text-white">
              Projects
            </h1>
          </div>
          <p className="font-courier text-[#666] text-sm">
            Manage your active productions.
          </p>
        </div>

        {/* Projects Grid or Empty State */}
        {allProjects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let message = "An unexpected error occurred";
  let details = "";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : "Error loading projects";
    details = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    message = "Error loading projects";
    details = error.message;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white flex items-center justify-center">
      <div className="bg-[#1c1c1f] border border-[#e02f2f] rounded-lg p-12 text-center max-w-md">
        <h1 className="font-oswald text-3xl uppercase tracking-wide mb-4 text-[#e02f2f]">
          {message}
        </h1>
        {details && (
          <p className="font-courier text-[#888] text-sm mb-8">{details}</p>
        )}
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-widest px-6 py-3 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
