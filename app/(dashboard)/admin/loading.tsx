import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-[200px] rounded-xl" />
        </div>
    );
}
