import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res = await fetch("http://103.82.20.93/io/s1213/edgeTTSClientKey", { cache: 'no-store' });
        if (!res.ok) {
            return NextResponse.json({ error: "Failed to fetch key from origin proxy" }, { status: 502 });
        }
        const key = await res.text();
        return new NextResponse(key.trim(), {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
