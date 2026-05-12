import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  let targetUrl = req.headers.get("x-target-url");
  let authHeader = req.headers.get("Authorization");
  const contentType = req.headers.get("Content-Type") || "application/json";

  let isAdminModel = false;
  let userId = null;
  let assignedModel = "gcli-gemini-3-pro-preview"; // fallback

  // Create a supabase client with service role to securely bypass RLS and verify token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Authenticate user via bearer token in the auth header if present, or from cookies.
  // We'll use the user ID to check quota if using the admin model.
  const authHeaderClient = req.headers.get("x-supabase-auth");
  if (authHeaderClient) {
    const { data: { user } } = await supabase.auth.getUser(authHeaderClient.replace("Bearer ", ""));
    userId = user?.id;
  }

  // Intercept Admin Model requests
  if (authHeader === "Bearer admin-model-key") {
    isAdminModel = true;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please login to use Admin Model." }), { status: 401 });
    }

    // Check quota and assigned model
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("admin_model_quota, admin_assigned_model")
      .eq("id", userId)
      .single();

    if (error || !profile || profile.admin_model_quota <= 0) {
      return new Response(JSON.stringify({ error: "Forbidden. Hết lượt dịch Admin Model." }), { status: 403 });
    }

    if (profile.admin_assigned_model) {
      assignedModel = profile.admin_assigned_model;
    }

    // Decrement quota
    await supabase
      .from("profiles")
      .update({ admin_model_quota: profile.admin_model_quota - 1 })
      .eq("id", userId);

    // Inject hidden URL and Key
    targetUrl = "https://catiecli.sukaka.top/v1/chat/completions";
    authHeader = "Bearer cat-a1991b0901187c4cad48859725a67ad185c78184a4fe5e6a";
  }

  if (!targetUrl) {
    return new Response("Missing x-target-url header", { status: 400 });
  }

  try {
    let body = await req.text();

    if (isAdminModel && userId) {
      // Parse the body and inject the actual model name required by the backend
      try {
        const payload = JSON.parse(body);
        payload.model = assignedModel;
        body = JSON.stringify(payload);
      } catch (e) {
        // Ignore if body is not JSON
      }
    }
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
