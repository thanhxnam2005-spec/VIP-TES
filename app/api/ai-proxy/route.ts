import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const targetUrl = req.headers.get("x-target-url");
  if (!targetUrl) {
    return new Response("Missing x-target-url header", { status: 400 });
  }

  const authHeader = req.headers.get("Authorization");
  const contentType = req.headers.get("Content-Type") || "application/json";

  try {
    const body = await req.text();
    
    // Forward the request to the actual AI provider
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader || "",
        "Content-Type": contentType,
        "Accept": "text/event-stream",
      },
      body,
    });

    // Proxy the response stream back to the client
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Proxy error:", error);
    return new Response(JSON.stringify({ error: "Failed to proxy AI request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
