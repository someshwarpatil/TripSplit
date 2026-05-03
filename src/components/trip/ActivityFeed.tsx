'use client';

import { Activity as ActivityIcon } from 'lucide-react';
import { Activity } from '@/types';
import { timeAgo } from '@/utils/format';

interface Props {
  activities: Activity[];
  members: { uid: string; displayName: string }[];
}

export default function ActivityFeed({ activities }: Props) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
        <ActivityIcon className="w-4 h-4" />
        Recent Activity
      </h3>
      <div className="space-y-2">
        {activities.slice(0, 10).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)]">{activity.description}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {activity.createdAt ? timeAgo(activity.createdAt instanceof Date ? activity.createdAt : new Date((activity.createdAt as { seconds: number }).seconds * 1000)) : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
