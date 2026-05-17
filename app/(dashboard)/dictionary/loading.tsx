import { Skeleton } from "@/components/ui/skeleton";

export default function DictionaryLoading() {
    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-52" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-28 rounded-md" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
