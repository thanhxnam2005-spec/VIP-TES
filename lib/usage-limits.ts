export const DAILY_FREE_DOWNLOAD_LIMIT = 100;
export const DAILY_FREE_TRANSLATE_LIMIT = 100;

function getTodayString() {
    return new Date().toISOString().split("T")[0];
}

export function checkAndIncrementUsage(
    type: "download" | "translate",
    amount: number = 1,
    isVip: boolean = false
): boolean {
    if (isVip) return true; // VIP uses unrestricted

    const limit = type === "download" ? DAILY_FREE_DOWNLOAD_LIMIT : DAILY_FREE_TRANSLATE_LIMIT;
    const key = `novel_studio_usage_${type}_${getTodayString()}`;

    const currentStr = localStorage.getItem(key) || "0";
    let currentUsage = parseInt(currentStr, 10);

    if (currentUsage + amount > limit) {
        return false; // Blocks the execution
    }

    currentUsage += amount;
    localStorage.setItem(key, currentUsage.toString());
    return true;
}

export function getRemainingUsage(type: "download" | "translate", isVip: boolean = false): number {
    if (isVip) return 999999;

    const limit = type === "download" ? DAILY_FREE_DOWNLOAD_LIMIT : DAILY_FREE_TRANSLATE_LIMIT;
    const key = `novel_studio_usage_${type}_${getTodayString()}`;

    const currentStr = localStorage.getItem(key) || "0";
    const currentUsage = parseInt(currentStr, 10);

    return Math.max(0, limit - currentUsage);
}
