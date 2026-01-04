'use client';

import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { Check, Loader2 } from 'lucide-react';
import { scenesAction } from '@/hooks/use-server-action';
import { toast } from 'sonner';

interface ApproveSceneButtonProps {
  sceneId: string;
  isApproved: boolean;
}

export function ApproveSceneButton({
  sceneId,
  isApproved,
}: ApproveSceneButtonProps) {
  const revalidator = useRevalidator();
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const result = await scenesAction('approveScene', sceneId);

      if (result.success) {
        toast.success('Scene approved!');
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to approve scene');
      }
    } catch (error) {
      console.error('Error approving scene:', error);
      toast.error('Failed to approve scene');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      const result = await scenesAction('rejectScene', sceneId);

      if (result.success) {
        toast.success('Scene reset to pending');
        revalidator.revalidate();
      } else {
        toast.error(result.error || 'Failed to reset scene');
      }
    } catch (error) {
      console.error('Error rejecting scene:', error);
      toast.error('Failed to reset scene');
    } finally {
      setIsLoading(false);
    }
  };

  if (isApproved) {
    return (
      <button
        onClick={handleReject}
        disabled={isLoading}
        className="flex items-center gap-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 px-4 py-2 font-oswald uppercase tracking-wider text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        Approved
      </button>
    );
  }

  return (
    <button
      onClick={handleApprove}
      disabled={isLoading}
      className="flex items-center gap-2 bg-[#f5c518]/20 text-[#f5c518] hover:bg-[#f5c518]/30 px-4 py-2 font-oswald uppercase tracking-wider text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Check className="w-4 h-4" />
      )}
      Approve Scene
    </button>
  );
}








