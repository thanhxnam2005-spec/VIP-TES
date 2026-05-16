import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user using cookies
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch models from external API using DB settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["admin_proxy_url", "admin_proxy_key"]);

    const settingsMap = (settingsData || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    let proxyUrl = (settingsMap["admin_proxy_url"] || "https://catiecli.sukaka.top/v1/chat/completions").trim().replace(/[^\x20-\x7E]/g, '');
    let proxyKey = (settingsMap["admin_proxy_key"] || "cat-a1991b0901187c4cad48859725a67ad185c78184a4fe5e6a").trim().replace(/[^\x20-\x7E]/g, '');

    // Convert URL to /models endpoint
    let modelsUrl = proxyUrl;
    if (proxyUrl.includes("/chat/completions")) {
      modelsUrl = proxyUrl.replace(/\/chat\/completions\/?$/, "/models");
    } else if (!proxyUrl.endsWith("/models")) {
      modelsUrl = proxyUrl.endsWith("/") ? proxyUrl + "models" : proxyUrl + "/models";
    }

    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${proxyKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`External API returned ${response.status} when fetching models. Body:`, text);
      return NextResponse.json({ error: `Lỗi từ server proxy: ${response.status} - ${text}` }, { status: 400 });
    }

    const data = await response.json();

    // The data should be { object: 'list', data: [{ id: '...', ... }] }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to fetch admin models:", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định khi gọi API" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { proxyUrl, proxyKey } = await req.json();
    if (!proxyUrl || !proxyKey) {
      return NextResponse.json({ error: "Missing url or key" }, { status: 400 });
    }

    proxyUrl = proxyUrl.trim().replace(/[^\x20-\x7E]/g, '');
    proxyKey = proxyKey.trim().replace(/[^\x20-\x7E]/g, '');

    let modelsUrl = proxyUrl;
    if (proxyUrl.includes("/chat/completions")) {
      modelsUrl = proxyUrl.replace(/\/chat\/completions\/?$/, "/models");
    } else if (!proxyUrl.endsWith("/models")) {
      modelsUrl = proxyUrl.endsWith("/") ? proxyUrl + "models" : proxyUrl + "/models";
    }

    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${proxyKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`External API returned ${response.status} when fetching models. Body:`, text);
      return NextResponse.json({ error: `Lỗi từ server proxy: ${response.status} - ${text}` }, { status: 400 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to fetch admin models via POST:", error);
    return NextResponse.json({ error: error.message || "Lỗi không xác định khi gọi API" }, { status: 500 });
  }
}
