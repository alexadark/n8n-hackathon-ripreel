import { Link } from "react-router";
import { Film, Calendar, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DeleteProjectButton } from "./delete-project-button";
import type { Project } from "@/lib/drizzle/schema";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Format date
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(project.updated_at || project.created_at));

  // Status color
  const statusColors: Record<string, string> = {
    parsing: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
    scene_validation: "bg-cyan-900/30 text-cyan-400 border-cyan-800",
    asset_generation: "bg-blue-900/30 text-blue-400 border-blue-800",
    timeline_review: "bg-purple-900/30 text-purple-400 border-purple-800",
    final_review: "bg-orange-900/30 text-orange-400 border-orange-800",
    assembling: "bg-pink-900/30 text-pink-400 border-pink-800",
    completed: "bg-green-900/30 text-green-400 border-green-800",
    failed: "bg-red-900/30 text-red-400 border-red-800",
  };

  return (
    <Card className="bg-[#1c1c1f] border-[#333] hover:border-[#f5c518] transition-colors group overflow-hidden">
      {/* Colored top border (Clapper Card style) */}
      <div className="h-1 bg-[#f5c518]" />

      <div className="p-6">
        {/* Thumbnail placeholder */}
        <div className="relative mb-4 aspect-video bg-[#0a0a0b] border border-[#333] rounded flex items-center justify-center overflow-hidden">
          <Film className="text-[#333] group-hover:text-[#444]" size={48} />
          {/* Status badge overlay */}
          <div className="absolute top-2 right-2">
            <Badge className={`${statusColors[project.status] || statusColors.parsing} border`}>
              {project.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Project info */}
        <div className="mb-4">
          <h3 className="font-oswald text-xl uppercase tracking-wide text-white mb-2 group-hover:text-[#f5c518] transition-colors">
            {project.title}
          </h3>

          <div className="flex items-center gap-4 text-[#666] text-sm font-courier">
            <div className="flex items-center gap-1">
              <Palette size={14} />
              <span className="capitalize">{project.visual_style?.replace("-", " ")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            to={`/projects/${project.id}/studio`}
            className="flex-1 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase text-sm tracking-wider py-2 px-4 text-center transition-colors"
          >
            Enter Studio
          </Link>
          <DeleteProjectButton projectId={project.id} projectTitle={project.title} variant="icon" />
        </div>
      </div>
    </Card>
  );
}
