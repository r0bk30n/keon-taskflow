import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for all data operations (bypass RLS for dynamic table insert)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get task details
    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .select("id, type, parent_request_id, source_sub_process_template_id, source_process_template_id")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      console.error("Task not found:", taskError);
      return new Response(JSON.stringify({ error: "Tâche non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build OR filter for applicable mappings
    const orParts: string[] = [];
    if (task.source_sub_process_template_id) {
      orParts.push(`sub_process_template_id.eq.${task.source_sub_process_template_id}`);
    }
    if (task.source_process_template_id) {
      orParts.push(`process_template_id.eq.${task.source_process_template_id}`);
    }

    if (orParts.length === 0) {
      return new Response(JSON.stringify({ message: "Pas de template associé", inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: mappings } = await adminClient
      .from("process_table_output_mappings")
      .select("*")
      .eq("is_active", true)
      .eq("trigger_event", "task_done")
      .or(orParts.join(","));

    if (!mappings || mappings.length === 0) {
      return new Response(JSON.stringify({ message: "Aucun mapping configuré", inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the request ID (parent request holds the field values)
    const requestId = task.type === "request" ? task.id : task.parent_request_id;
    if (!requestId) {
      return new Response(JSON.stringify({ error: "Demande parente non trouvée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all field values for the request
    const { data: fieldValues } = await adminClient
      .from("request_field_values")
      .select("field_id, value")
      .eq("task_id", requestId);

    const fieldValueMap: Record<string, string> = {};
    for (const fv of fieldValues || []) {
      fieldValueMap[fv.field_id] = fv.value || "";
    }

    const results: Array<{ table: string; success: boolean; error?: string }> = [];

    for (const mapping of mappings) {
      const fieldMappings = (mapping.field_mappings as Array<{ custom_field_id: string; target_column: string }>) || [];
      const staticMappings = (mapping.static_mappings as Array<{ target_column: string; static_value: string }>) || [];
      const targetTable = mapping.target_table;

      // Validate table name (alphanumeric + underscore only)
      if (!/^[a-z_][a-z0-9_]*$/.test(targetTable)) {
        console.error(`Invalid table name rejected: ${targetTable}`);
        results.push({ table: targetTable, success: false, error: "Nom de table invalide" });
        continue;
      }

      // Build the row to insert
      const row: Record<string, string> = {};

      for (const fm of fieldMappings) {
        const value = fieldValueMap[fm.custom_field_id];
        if (value !== undefined && value !== null && value !== "") {
          row[fm.target_column] = value;
        }
      }

      for (const sm of staticMappings) {
        if (sm.static_value !== undefined && sm.static_value !== null) {
          row[sm.target_column] = sm.static_value;
        }
      }

      if (Object.keys(row).length === 0) {
        results.push({ table: targetTable, success: false, error: "Aucune donnée à insérer" });
        continue;
      }

      // Insert via Supabase client (supports dynamic table names)
      const { error: insertError } = await adminClient
        .from(targetTable)
        .insert(row);

      if (insertError) {
        console.error(`Insert error for ${targetTable}:`, insertError);
        results.push({ table: targetTable, success: false, error: insertError.message });
      } else {
        console.log(`Successfully inserted into ${targetTable} from task ${task_id}`);
        results.push({ table: targetTable, success: true });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({ success: successCount > 0, inserted: successCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in process-table-output:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
