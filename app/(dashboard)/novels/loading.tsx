import { Skeleton } from "@/components/ui/skeleton";

export default function NovelsLoading() {
    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="h-[120px] w-[90px] rounded-lg" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-80" />
                </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
            </div>
        </div>
    );
}
