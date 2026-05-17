import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-[200px] w-full rounded-xl border-2 border-dashed" />
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
