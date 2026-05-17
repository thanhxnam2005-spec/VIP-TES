import { Skeleton } from "@/components/ui/skeleton";

export default function ScraperLoading() {
    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[300px] rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-[140px] rounded-md" />
                </div>
            </div>
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
