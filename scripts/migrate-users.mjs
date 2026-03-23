/**
 * Migration des utilisateurs Supabase Auth
 * Lit users_export.csv (export Supabase Dashboard) et crée chaque utilisateur
 * dans le nouveau projet via l'Admin API.
 *
 * Usage : node scripts/migrate-users.mjs <NEW_SERVICE_ROLE_KEY>
 * Les mots de passe ne peuvent pas être transférés depuis un export CSV —
 * chaque utilisateur devra faire "Mot de passe oublié" la première fois.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NEW_PROJECT_URL = process.env.SUPABASE_URL || 'https://yqdbuwidnwhgqimimzpm.supabase.co';
const NEW_SERVICE_ROLE_KEY = process.argv[2];

if (!NEW_SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/migrate-users.mjs <NEW_SERVICE_ROLE_KEY>');
  process.exit(1);
}

const CSV_PATH = path.resolve(__dirname, '../users_export.csv');

// Lit et parse le CSV
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim() ?? '']));
  });
}

async function createUser(user) {
  const body = {
    email: user.email,
    email_confirm: true,
    user_metadata: {},
  };

  // Préserve l'UUID original pour ne pas casser les FK dans profiles/tasks/etc.
  if (user.id) body.id = user.id;

  const res = await fetch(`${NEW_PROJECT_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: NEW_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${NEW_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    return { ok: false, error: json.msg ?? json.message ?? JSON.stringify(json) };
  }
  return { ok: true };
}

async function main() {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const users = parseCSV(csvContent).filter(u => u.email);

  console.log(`\n📋 ${users.length} utilisateurs à migrer vers ${NEW_PROJECT_URL}\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const user of users) {
    const result = await createUser(user);
    if (result.ok) {
      console.log(`  ✅  ${user.email}`);
      ok++;
    } else if (result.error?.includes('already been registered') || result.error?.includes('already exists')) {
      console.log(`  ⏭️   ${user.email} (déjà existant)`);
      skip++;
    } else {
      console.log(`  ❌  ${user.email} — ${result.error}`);
      fail++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Créés   : ${ok}`);
  console.log(`⏭️  Skippés : ${skip}`);
  console.log(`❌ Erreurs : ${fail}`);
  console.log(`─────────────────────────────────`);
  console.log(`\n⚠️  Les mots de passe ne sont pas transférés.`);
  console.log(`   Chaque utilisateur doit utiliser "Mot de passe oublié" pour se connecter.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
