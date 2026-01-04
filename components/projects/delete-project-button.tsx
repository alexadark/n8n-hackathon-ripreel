"use client";

import { useState } from "react";
import { useNavigate, useRevalidator } from "react-router";
import { Trash2, AlertTriangle } from "lucide-react";
import { projectsAction } from "@/hooks/use-server-action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteProjectButtonProps {
  projectId: string;
  projectTitle: string;
  variant?: "full" | "icon";
}

export function DeleteProjectButton({ projectId, projectTitle, variant = "full" }: DeleteProjectButtonProps) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    console.log("🗑️ Deleting project:", projectId);

    const result = await projectsAction('deleteProject', projectId);

    if (result.success) {
      console.log("✅ Project deleted successfully");
      setIsOpen(false);
      navigate("/projects");
      revalidator.revalidate();
    } else {
      console.error("❌ Failed to delete project:", result.error);
      setIsDeleting(false);
      // Keep dialog open to show error
    }
  };

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a Link
    setIsOpen(true);
  };

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleOpenDialog}
          className="bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 p-2 transition-colors"
          title="Delete project"
        >
          <Trash2 size={18} />
        </button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="bg-[#1c1c1f] border-red-800 text-white">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-red-400" size={24} />
                <DialogTitle className="font-oswald text-xl uppercase tracking-wider text-white">
                  Delete Project
                </DialogTitle>
              </div>
              <DialogDescription className="font-courier text-[#888] text-sm">
                Are you sure you want to delete <span className="text-white font-bold">&quot;{projectTitle}&quot;</span>?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-900/20 border border-red-800/50 p-4 rounded">
                <p className="font-courier text-red-300 text-sm mb-3">
                  This will permanently delete:
                </p>
                <ul className="font-courier text-[#888] text-xs space-y-1 ml-4">
                  <li>• The project</li>
                  <li>• All scenes</li>
                  <li>• All generated assets</li>
                </ul>
                <p className="font-courier text-red-400 text-xs mt-3 font-bold">
                  ⚠️ This action cannot be undone.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="flex-1 bg-[#333] hover:bg-[#444] text-white font-oswald uppercase text-sm tracking-wider py-2 px-4 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-900/50 hover:bg-red-900/70 border border-red-800 text-red-400 font-oswald uppercase text-sm tracking-wider py-2 px-4 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenDialog}
        className="inline-flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 font-oswald text-sm uppercase tracking-wider px-4 py-2 transition-colors"
        title="Delete project"
      >
        <Trash2 size={16} />
        Delete Project
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#1c1c1f] border-red-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="text-red-400" size={24} />
              <DialogTitle className="font-oswald text-xl uppercase tracking-wider text-white">
                Delete Project
              </DialogTitle>
            </div>
            <DialogDescription className="font-courier text-[#888] text-sm">
              Are you sure you want to delete <span className="text-white font-bold">&quot;{projectTitle}&quot;</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-900/20 border border-red-800/50 p-4 rounded">
              <p className="font-courier text-red-300 text-sm mb-3">
                This will permanently delete:
              </p>
              <ul className="font-courier text-[#888] text-xs space-y-1 ml-4">
                <li>• The project</li>
                <li>• All scenes</li>
                <li>• All generated assets</li>
              </ul>
              <p className="font-courier text-red-400 text-xs mt-3 font-bold">
                ⚠️ This action cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <button
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
              className="flex-1 bg-[#333] hover:bg-[#444] text-white font-oswald uppercase text-sm tracking-wider py-2 px-4 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-900/50 hover:bg-red-900/70 border border-red-800 text-red-400 font-oswald uppercase text-sm tracking-wider py-2 px-4 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
