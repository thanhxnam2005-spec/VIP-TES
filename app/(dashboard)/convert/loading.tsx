import { Skeleton } from "@/components/ui/skeleton";

export default function ConvertLoading() {
    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-[200px] rounded-xl" />
                <Skeleton className="h-[200px] rounded-xl" />
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
        </div>
    );
}
