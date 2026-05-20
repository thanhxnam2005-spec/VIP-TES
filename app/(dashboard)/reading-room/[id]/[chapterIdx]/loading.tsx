import { Skeleton } from "@/components/ui/skeleton";

export default function ReadingRoomChapterLoading() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-0 sm:px-8 min-h-screen">
            {/* Sticky nav skeleton */}
            <div className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-md border-b flex items-center justify-between mb-8">
                <Skeleton className="h-5 w-16" />
                <div className="flex gap-3 items-center">
                    <Skeleton className="h-8 w-[120px] rounded-md" />
                    <Skeleton className="h-7 w-20 rounded-md" />
                </div>
            </div>

            {/* Title skeleton */}
            <Skeleton className="h-10 w-3/4 mx-auto mb-12 mt-8" />

            {/* Content lines skeleton */}
            <div className="space-y-4 max-w-3xl mx-auto">
                {Array.from({ length: 18 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="h-5 rounded"
                        style={{ width: `${85 + Math.sin(i) * 15}%`, opacity: 1 - i * 0.03 }}
                    />
                ))}
            </div>
        </main>
    );
}
