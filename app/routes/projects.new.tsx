import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/drizzle/db.server";
import { visualStyles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/projects.new";
import { NewProjectForm } from "@/components/visual-styles";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New Project - RipReel" },
    {
      name: "description",
      content: "Start a new rip reel by uploading your screenplay.",
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  // Fetch system visual styles from database
  const styles = await db
    .select()
    .from(visualStyles)
    .where(eq(visualStyles.is_system, true))
    .orderBy(visualStyles.name);

  return { styles };
}

export default function NewProjectPage({ loaderData }: Route.ComponentProps) {
  const { styles } = loaderData;

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white relative">
      {/* Header */}
      <header className="border-b border-[#333] py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link
            to="/"
            className="text-[#888] hover:text-[#f5c518] transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div className="font-oswald text-2xl font-bold tracking-widest">
            ripreel<span className="text-[#f5c518]">.io</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Title */}
        <div className="mb-12">
          <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight mb-4 text-white">
            Start Your Rip Reel
          </h1>
          <p className="font-courier text-[#888] text-lg">
            Upload screenplay or paste text → Select visual style → Generate
          </p>
        </div>

        {/* Form Component */}
        <NewProjectForm styles={styles} />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let message = "An unexpected error occurred";
  let details = "";

  if (isRouteErrorResponse(error)) {
    message = "Error creating project";
    details = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    message = "Error creating project";
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
          to="/projects"
          className="inline-flex items-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-widest px-6 py-3 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
