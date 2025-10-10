
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MissionStatus } from "@/types";

type Status = MissionStatus | 'Available' | 'Busy' | 'Unavailable'

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: Record<Status, string> = {
    'Pending': 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-500/20',
    'Booked': 'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/20',
    'Completed': 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-500/20',
    'Canceled': 'bg-red-500/20 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20',
    'Postponed': 'bg-sky-500/20 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-500/20',
    'Lost': 'bg-destructive/20 text-destructive dark:bg-destructive/10 dark:text-destructive border-destructive/20',
    'Paid': 'bg-teal-500/20 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-500/20',
    'Available': 'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/20',
    'Busy': 'bg-red-500/20 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20',
    'Unavailable': 'bg-gray-500/20 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border-gray-500/20',
  };

  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {status}
    </Badge>
  );
}
