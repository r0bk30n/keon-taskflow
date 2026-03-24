import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

    const syncSecret = (req.headers.get("x-sync-secret") ?? "").trim();
    const expectedSyncSecret = (Deno.env.get("SYNC_SECRET") ?? "").trim();

    const authorizedByAnonKey = !!token && !!anonKey && token === anonKey;
    const authorizedBySyncSecret =
      !!syncSecret && !!expectedSyncSecret && syncSecret === expectedSyncSecret;

    // Double security: require BOTH anon/publishable bearer and sync secret.
    if (!authorizedByAnonKey || !authorizedBySyncSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const table = body?.table as string;
    const select = (body?.select as string) || "*";
    const limit = Math.min(Math.max(Number(body?.limit) || 1000, 1), 5000);
    const offset = Math.max(Number(body?.offset) || 0, 0);

    if (!table || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing table name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error, count } = await admin
      .from(table)
      .select(select, { count: "exact" })
      .range(offset, offset + limit - 1);

    if (error) {
      return new Response(
        JSON.stringify({ error: "Query failed", details: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, rows: data, count }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
