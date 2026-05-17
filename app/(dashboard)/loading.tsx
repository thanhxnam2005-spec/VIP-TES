import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root-level loading skeleton for the entire (dashboard) group.
 * Shown when navigating between major sections.
 */
export default function DashboardGroupLoading() {
    return (
        <div className="flex-1 p-6 space-y-6 animate-page-enter">
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
        </div>
    );
}
