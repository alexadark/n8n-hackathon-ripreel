'use client';

import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { Check, Loader2 } from 'lucide-react';
import { bibleThreeShotAction } from '@/hooks/use-server-action';

interface BulkApproveBibleButtonProps {
  projectId: string;
  readyCount: number;
}

export function BulkApproveBibleButton({
  projectId,
  readyCount,
}: BulkApproveBibleButtonProps) {
  const revalidator = useRevalidator();
  const [isApproving, setIsApproving] = useState(false);

  const handleBulkApprove = async () => {
    setIsApproving(true);
    const result = await bibleThreeShotAction('bulkApproveBibleImages', projectId);

    if (result.success) {
      revalidator.revalidate();
    } else {
      console.error('Failed to bulk approve:', result.error);
      alert('Failed to bulk approve: ' + result.error);
    }
    setIsApproving(false);
  };

  if (readyCount === 0) {
    return null;
  }

  return (
    <button
      onClick={handleBulkApprove}
      disabled={isApproving}
      className="bg-green-600 hover:bg-green-500 text-white font-oswald uppercase text-sm tracking-wider px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isApproving ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Approving...
        </>
      ) : (
        <>
          <Check size={16} />
          Approve All ({readyCount})
        </>
      )}
    </button>
  );
}
