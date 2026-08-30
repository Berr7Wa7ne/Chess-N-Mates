/**
 * One-shot: ensure password_hash column users get default hash,
 * normalize phones where possible, promote seed admin.
 *
 * Usage: node backend/scripts/seed-auth-passwords.js
 */
require('../config/env');
const { supabaseAdmin } = require('../config/supabase');
const { normalizeNgPhone } = require('../utils/phone');
const { hashDefaultPassword } = require('../utils/password');

const SEED_ADMIN_LOCAL = '8148429834';

async function main() {
  const defaultHash = await hashDefaultPassword();
  const adminPhone = normalizeNgPhone(SEED_ADMIN_LOCAL);

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, phone_number, role, password_hash');

  if (error) {
    console.error('Failed to list users:', error.message);
    process.exit(1);
  }

  let updatedPasswords = 0;
  let normalizedPhones = 0;
  let promotedAdmin = false;

  for (const user of users || []) {
    const updates = {};
    const normalized = normalizeNgPhone(user.phone_number);

    if (normalized && normalized !== user.phone_number) {
      updates.phone_number = normalized;
      normalizedPhones += 1;
    }

    if (!user.password_hash) {
      updates.password_hash = defaultHash;
      updatedPasswords += 1;
    }

    const phoneForAdmin = updates.phone_number || user.phone_number;
    if (adminPhone && (phoneForAdmin === adminPhone || normalizeNgPhone(phoneForAdmin) === adminPhone)) {
      if (user.role !== 'admin') {
        updates.role = 'admin';
        promotedAdmin = true;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.warn(`Skip ${user.id}: ${updateError.message}`);
    }
  }

  // Ensure seed admin exists as a row if missing
  const { data: existingAdmin } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone_number', adminPhone)
    .maybeSingle();

  if (!existingAdmin && adminPhone) {
    const { error: insertError } = await supabaseAdmin.from('users').insert([
      {
        phone_number: adminPhone,
        display_name: 'Admin',
        email: `${adminPhone}@temp.com`,
        role: 'admin',
        user_status: 'active',
        password_hash: defaultHash,
      },
    ]);
    if (insertError) {
      console.warn('Could not create seed admin:', insertError.message);
    } else {
      console.log(`Created seed admin ${adminPhone}`);
      promotedAdmin = true;
    }
  }

  console.log(
    JSON.stringify(
      {
        users: (users || []).length,
        updatedPasswords,
        normalizedPhones,
        promotedAdmin,
        adminPhone,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
