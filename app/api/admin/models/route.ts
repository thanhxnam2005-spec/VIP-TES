import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user using cookies
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
      const email = user.email?.toLowerCase();
      if (email === "nthanhnam2005@gmail.com" || email === "thanhxnam2005@gmail.com") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch models from external API
    const response = await fetch("https://catiecli.sukaka.top/v1/models", {
      method: "GET",
      headers: {
        "Authorization": "Bearer cat-a1991b0901187c4cad48859725a67ad185c78184a4fe5e6a",
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 } // cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }

    const data = await response.json();
    
    // The data should be { object: 'list', data: [{ id: '...', ... }] }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch admin models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
