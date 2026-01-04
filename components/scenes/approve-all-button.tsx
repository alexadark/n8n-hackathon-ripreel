'use client';

import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { CheckCheck, Loader2 } from 'lucide-react';
import { scenesAction } from '@/hooks/use-server-action';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ApproveAllButtonProps {
  projectId: string;
  pendingCount: number;
  disabled?: boolean;
}

export function ApproveAllButton({
  projectId,
  pendingCount,
  disabled = false,
}: ApproveAllButtonProps) {
  const revalidator = useRevalidator();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleApproveAll = async () => {
    setIsLoading(true);
    try {
      const result = await scenesAction('approveAllScenes', projectId);

      if (result.success) {
        const count = result.approvedCount || 0;
        toast.success(
          count > 0
            ? `Approved ${count} scene${count === 1 ? '' : 's'}!`
            : 'All scenes already approved'
        );
        setIsOpen(false);
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to approve scenes');
      }
    } catch (error) {
      console.error('Error approving all scenes:', error);
      toast.error('Failed to approve scenes');
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          disabled={disabled}
          className="flex items-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider px-6 py-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck className="w-4 h-4" />
          Approve All ({pendingCount})
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#1c1c1f] border-[#333] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-oswald text-2xl uppercase text-white">
            Approve All Scenes?
          </DialogTitle>
          <DialogDescription className="font-courier text-[#888] text-base">
            This will approve all {pendingCount} pending scene
            {pendingCount === 1 ? '' : 's'} and allow you to proceed to the
            studio phase.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className="bg-[#333] hover:bg-[#444] text-white font-oswald uppercase tracking-wider px-6 py-2 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveAll}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-wider px-6 py-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCheck className="w-4 h-4" />
                Approve All
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}








