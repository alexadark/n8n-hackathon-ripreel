import { Users, MapPin, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BibleProgressProps {
  characters: { total: number; approved: number };
  locations: { total: number; approved: number };
}

export function BibleProgress({ characters, locations }: BibleProgressProps) {
  const charPercent = characters.total > 0
    ? Math.round((characters.approved / characters.total) * 100)
    : 0;
  const locPercent = locations.total > 0
    ? Math.round((locations.approved / locations.total) * 100)
    : 0;

  const allCharApproved = characters.total > 0 && characters.approved === characters.total;
  const allLocApproved = locations.total > 0 && locations.approved === locations.total;

  return (
    <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <CheckCircle size={20} className="text-[#f5c518]" />
        <h3 className="font-oswald uppercase tracking-wider text-white">
          Bible Approval Progress
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Characters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className={allCharApproved ? 'text-green-400' : 'text-[#888]'} />
              <span className="font-courier text-sm text-[#888]">Characters</span>
            </div>
            <span className={cn(
              'font-oswald text-sm',
              allCharApproved ? 'text-green-400' : 'text-white'
            )}>
              {characters.approved}/{characters.total}
              {allCharApproved && <span className="ml-1">✓</span>}
            </span>
          </div>
          <div className="h-2 bg-[#333] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                allCharApproved ? 'bg-green-500' : 'bg-[#f5c518]'
              )}
              style={{ width: `${charPercent}%` }}
            />
          </div>
          <p className="font-courier text-xs text-[#666] mt-1">
            {allCharApproved ? 'All approved' : `${charPercent}% complete`}
          </p>
        </div>

        {/* Locations */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin size={16} className={allLocApproved ? 'text-green-400' : 'text-[#888]'} />
              <span className="font-courier text-sm text-[#888]">Locations</span>
            </div>
            <span className={cn(
              'font-oswald text-sm',
              allLocApproved ? 'text-green-400' : 'text-white'
            )}>
              {locations.approved}/{locations.total}
              {allLocApproved && <span className="ml-1">✓</span>}
            </span>
          </div>
          <div className="h-2 bg-[#333] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                allLocApproved ? 'bg-green-500' : 'bg-[#f5c518]'
              )}
              style={{ width: `${locPercent}%` }}
            />
          </div>
          <p className="font-courier text-xs text-[#666] mt-1">
            {allLocApproved ? 'All approved' : `${locPercent}% complete`}
          </p>
        </div>
      </div>

      {/* Overall Status */}
      <div className="mt-6 pt-4 border-t border-[#333]">
        {allCharApproved && allLocApproved ? (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={20} />
            <span className="font-oswald uppercase tracking-wider">
              Ready to continue to Scene Validation
            </span>
          </div>
        ) : (
          <p className="font-courier text-sm text-[#888]">
            Approve all characters and locations to continue.
            {!allCharApproved && characters.total > 0 && (
              <span className="text-[#f5c518]">
                {' '}Need {characters.total - characters.approved} more character(s).
              </span>
            )}
            {!allLocApproved && locations.total > 0 && (
              <span className="text-[#f5c518]">
                {' '}Need {locations.total - locations.approved} more location(s).
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
