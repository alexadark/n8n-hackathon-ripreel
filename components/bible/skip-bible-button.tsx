'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { bibleAction } from '@/hooks/use-server-action';

interface SkipBibleButtonProps {
  projectId: string;
}

export function SkipBibleButton({ projectId }: SkipBibleButtonProps) {
  const navigate = useNavigate();
  const [isSkipping, setIsSkipping] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      const result = await bibleAction('skipBibleReview', projectId);
      if (result.success) {
        toast.success('Bible review skipped');
        navigate(`/projects/${projectId}/studio/scenes`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to skip Bible review');
    } finally {
      setIsSkipping(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-[#333] text-[#888] hover:border-[#666] hover:text-white font-oswald uppercase tracking-wider"
        >
          <SkipForward size={16} className="mr-2" />
          Skip Bible Review
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1c1c1f] border-[#333]">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-white">
            Skip Bible Review?
          </DialogTitle>
          <DialogDescription className="font-courier text-[#888]">
            Are you sure you want to skip the Bible review phase?
            Character and location reference images help maintain visual consistency
            across all scenes. Without them, each scene will be generated independently.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[#333] text-[#888] hover:border-[#666] hover:text-white font-oswald uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSkip}
            disabled={isSkipping}
            className="bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider"
          >
            {isSkipping ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <SkipForward size={16} className="mr-2" />
            )}
            Skip & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
