import { Skeleton } from "@/components/ui/skeleton";

export default function BotTranslateLoading() {
    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-80" />
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
