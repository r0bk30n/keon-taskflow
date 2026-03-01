import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
};

interface Employee {
  id_lucca: string | number;
  display_name: string;
  email?: string;
  job_title?: string;
  department?: string;
  company?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // ── Auth via sync secret (appelé par Fabric, pas par un user) ──
  const syncSecret = req.headers.get('x-sync-secret');
  if (!syncSecret || syncSecret !== Deno.env.get('SYNC_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const body = await req.json();
    const employees: Employee[] = body.employees;

    if (!Array.isArray(employees) || employees.length === 0) {
      return new Response(JSON.stringify({ error: 'employees array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const emp of employees) {
      const { id_lucca, display_name, email, job_title, department, company } = emp;

      // ── Validation minimale ──
      if (!id_lucca || !display_name) {
        results.skipped++;
        continue;
      }

      const idLuccaStr = String(id_lucca);

      try {
        // ── Vérifier si le profil existe déjà par id_lucca ──
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id, lovable_status, user_id')
          .eq('id_lucca', idLuccaStr)
          .maybeSingle();

        if (existing) {
          // ── SALARIÉ EXISTANT : mise à jour RH uniquement ──
          // On ne touche JAMAIS lovable_status (géré manuellement par l'admin)
          await supabaseAdmin
            .from('profiles')
            .update({
              display_name,
              job_title: job_title ?? null,
              department: department ?? null,
              company: company ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          results.updated++;
        } else {
          // ── NOUVEAU SALARIÉ : créer un auth.user + profil avec lovable_status = NOK ──

          // Email à utiliser pour le compte Auth
          // Si email Lucca disponible → on l'utilise
          // Sinon → email fictif non-connectable (format noreply)
          const authEmail = email?.trim()
            ? email.trim().toLowerCase()
            : `lucca-${idLuccaStr}@noreply.keon-group.com`;

          // Vérifier qu'aucun profil n'utilise déjà cet email
          const { data: emailConflict } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('lovable_email', authEmail)
            .maybeSingle();

          if (emailConflict) {
            // Email déjà utilisé → lier l'id_lucca au profil existant si pas encore fait
            await supabaseAdmin
              .from('profiles')
              .update({
                id_lucca: idLuccaStr,
                display_name,
                job_title: job_title ?? null,
                department: department ?? null,
                company: company ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', emailConflict.id)
              .is('id_lucca', null); // seulement si id_lucca pas encore renseigné

            results.updated++;
            continue;
          }

          // Mot de passe temporaire aléatoire (le salarié ne peut pas se connecter tant que lovable_status = NOK)
          const tempPassword = `Lucca${idLuccaStr}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}!`;

          // Créer l'utilisateur Auth
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password: tempPassword,
            email_confirm: true, // confirmé d'emblée (pas d'email envoyé)
            user_metadata: {
              display_name,
              lucca_id: idLuccaStr,
            },
          });

          if (authError || !authUser?.user) {
            console.error(`Auth creation error for ${display_name}:`, authError);
            results.errors.push(`${display_name} (id_lucca=${idLuccaStr}): ${authError?.message ?? 'Auth user creation failed'}`);
            continue;
          }

          // Le trigger handle_new_user() crée automatiquement un profil vide lié à auth.user
          // On le met à jour avec les données Lucca
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              id_lucca: idLuccaStr,
              display_name,
              job_title: job_title ?? null,
              department: department ?? null,
              company: company ?? null,
              lovable_email: authEmail,
              lovable_status: 'NOK',   // ← à passer OK manuellement par l'admin
              status: 'active',
              must_change_password: true,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', authUser.user.id);

          if (updateError) {
            console.error(`Profile update error for ${display_name}:`, updateError);
            results.errors.push(`${display_name}: profil créé mais mise à jour échouée: ${updateError.message}`);
          } else {
            results.created++;
            console.log(`✅ Nouveau salarié créé: ${display_name} (id_lucca=${idLuccaStr}, email=${authEmail})`);
          }
        }
      } catch (empError: unknown) {
        const msg = empError instanceof Error ? empError.message : String(empError);
        console.error(`Error processing ${display_name}:`, msg);
        results.errors.push(`${display_name}: ${msg}`);
      }
    }

    console.log(`Sync terminé: créés=${results.created}, mis à jour=${results.updated}, ignorés=${results.skipped}, erreurs=${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        error_count: results.errors.length,
        errors: results.errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('sync-lucca-profiles error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
