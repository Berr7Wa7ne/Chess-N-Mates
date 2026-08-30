const { supabase, supabaseAdmin } = require('../config/supabase');
const { normalizeNgPhone, phoneLookupCandidates } = require('../utils/phone');
const {
  assertAdminCode,
  getDefaultPassword,
  hashDefaultPassword,
  hashPassword,
  verifyPassword,
} = require('../utils/password');

const VALID_ROLES = ['admin', 'player'];

function normalizeRole(role) {
  if (!role) return 'player';
  return String(role).toLowerCase();
}

function publicUser(row) {
  if (!row) return row;
  const { password_hash, ...safe } = row;
  return safe;
}

async function findUserByPhone(phoneInput, select = '*') {
  const candidates = phoneLookupCandidates(phoneInput);
  if (!candidates.length) return { data: null, error: null };

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(select)
    .in('phone_number', candidates)
    .limit(1)
    .maybeSingle();

  return { data, error };
}

async function ensurePasswordHash(user, plainPassword) {
  if (user.password_hash) {
    const ok = await verifyPassword(plainPassword, user.password_hash);
    return { ok, updatedHash: null };
  }

  // Legacy accounts: accept default password once, then persist a hash.
  if (String(plainPassword) !== getDefaultPassword()) {
    return { ok: false, updatedHash: null };
  }

  const updatedHash = await hashDefaultPassword();
  await supabaseAdmin
    .from('users')
    .update({ password_hash: updatedHash })
    .eq('id', user.id);

  return { ok: true, updatedHash };
}

exports.registerUser = async (req, res) => {
  const {
    phone_number,
    whatsapp_id,
    display_name,
    role: rawRole,
    chess_platform,
    chess_com_username,
    lichess_username,
    password,
    admin_code,
  } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      success: false,
      error: { message: 'phone_number is required' },
    });
  }

  const normalizedPhone = normalizeNgPhone(phone_number);
  if (!normalizedPhone) {
    return res.status(400).json({
      success: false,
      error: {
        message:
          'Invalid phone number. Use +234…, 234…, or your 10-digit local number.',
      },
    });
  }

  const role = normalizeRole(rawRole);
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid role. Must be admin or player.' },
    });
  }

  if (role === 'admin' && !assertAdminCode(admin_code)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Valid admin code is required to register as admin.' },
    });
  }

  const plainPassword =
    password && String(password).trim()
      ? String(password).trim()
      : getDefaultPassword();

  if (plainPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: { message: 'Password must be at least 6 characters.' },
    });
  }

  const { data: existingUser, error: lookupError } = await findUserByPhone(
    normalizedPhone,
    'id'
  );

  if (lookupError) {
    return res.status(400).json({ success: false, error: { message: lookupError.message } });
  }

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: { message: 'Phone number already registered' },
    });
  }

  let finalDisplayName = display_name;
  if (chess_platform === 'chess.com' && chess_com_username) {
    finalDisplayName = chess_com_username;
  } else if (chess_platform === 'lichess' && lichess_username) {
    finalDisplayName = lichess_username;
  } else if (!finalDisplayName) {
    return res.status(400).json({
      success: false,
      error: { message: 'display_name is required for over_the_board platform' },
    });
  }

  const password_hash = await hashPassword(plainPassword);

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        phone_number: normalizedPhone,
        whatsapp_id: whatsapp_id || null,
        display_name: finalDisplayName,
        role,
        email: `${normalizedPhone}@temp.com`,
        chess_platform: chess_platform || null,
        chess_com_username: chess_platform === 'chess.com' ? chess_com_username : null,
        lichess_username: chess_platform === 'lichess' ? lichess_username : null,
        password_hash,
        user_status: 'active',
      },
    ])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.status(201).json({ success: true, data: publicUser(data) });
};

exports.loginUser = async (req, res) => {
  const { phone_number, password, role: rawRole, admin_code } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      success: false,
      error: { message: 'phone_number is required' },
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      error: { message: 'password is required' },
    });
  }

  const requestedRole = normalizeRole(rawRole || 'player');
  if (!VALID_ROLES.includes(requestedRole)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid role. Choose admin or member.' },
    });
  }

  if (requestedRole === 'admin' && !assertAdminCode(admin_code)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Valid admin code is required to sign in as admin.' },
    });
  }

  const { data, error } = await findUserByPhone(
    phone_number,
    'id, phone_number, display_name, role, chess_platform, chess_username, chess_com_username, lichess_username, chess_elo, whatsapp_phone, avatar_url, password_hash, user_status'
  );

  if (error) {
    return res.status(400).json({ success: false, error: { message: error.message } });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      error: { message: 'No account found for this phone number' },
    });
  }

  if (data.user_status === 'banned') {
    return res.status(403).json({
      success: false,
      error: { message: 'This account has been banned.' },
    });
  }

  const accountRole = normalizeRole(data.role);

  // Admins may sign in as members (player surface). Only true admins may pick admin.
  if (requestedRole === 'admin' && accountRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'This account is not an admin. Sign in as a member instead.',
      },
    });
  }

  const { ok } = await ensurePasswordHash(data, password);
  if (!ok) {
    return res.status(401).json({
      success: false,
      error: { message: 'Incorrect password' },
    });
  }

  // Persist normalized phone if legacy format was stored
  const normalizedPhone = normalizeNgPhone(phone_number);
  if (normalizedPhone && data.phone_number !== normalizedPhone) {
    await supabaseAdmin
      .from('users')
      .update({ phone_number: normalizedPhone })
      .eq('id', data.id);
    data.phone_number = normalizedPhone;
  }

  // Session role follows the portal they chose (admin can enter as member).
  const sessionUser = {
    ...publicUser(data),
    role: requestedRole,
    account_role: accountRole,
  };

  res.json({ success: true, data: sessionUser });
};

exports.registerChess = async (req, res) => {
  const { id } = req.params;
  const { chess_username, chess_platform } = req.body;

  if (!chess_username || !chess_platform) {
    return res.status(400).json({
      success: false,
      error: { message: 'chess_username and chess_platform are required' },
    });
  }

  const updates = {
    chess_username,
    chess_platform,
    chess_elo: 1200,
  };

  if (chess_platform === 'chess.com') {
    updates.chess_com_username = chess_username;
    updates.display_name = chess_username;
  } else if (chess_platform === 'lichess') {
    updates.lichess_username = chess_username;
    updates.display_name = chess_username;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data: publicUser(data) });
};

exports.listUsers = async (req, res) => {
  const { role, status } = req.query;

  let query = supabaseAdmin
    .from('users')
    .select(
      'id, phone_number, display_name, role, avatar_url, chess_username, chess_platform, chess_com_username, lichess_username, chess_elo, user_status, last_activity_at, created_at, updated_at, whatsapp_phone'
    )
    .order('created_at', { ascending: false });

  if (role) {
    query = query.eq('role', String(role).toLowerCase());
  }
  if (status) {
    query = query.eq('user_status', String(status).toLowerCase());
  }

  const { data, error } = await query;
  if (error) {
    return res.status(400).json({ success: false, error: { message: error.message } });
  }

  res.json({ success: true, data: data || [] });
};

exports.getUser = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data: publicUser(data) });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    display_name,
    avatar_url,
    chess_username,
    chess_com_username,
    lichess_username,
  } = req.body;

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (lookupError || !existing) {
    return res.status(404).json({
      success: false,
      error: { message: lookupError?.message || 'User not found' },
    });
  }

  const updates = {};

  if (display_name !== undefined) {
    updates.display_name = display_name?.trim() || existing.display_name;
  }
  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url;
  }

  let nextChessCom =
    chess_com_username !== undefined
      ? chess_com_username?.trim() || null
      : existing.chess_com_username;
  let nextLichess =
    lichess_username !== undefined
      ? lichess_username?.trim() || null
      : existing.lichess_username;
  let nextChessUsername =
    chess_username !== undefined
      ? chess_username?.trim() || null
      : existing.chess_username;

  if (chess_com_username !== undefined) {
    updates.chess_com_username = nextChessCom;
  }
  if (lichess_username !== undefined) {
    updates.lichess_username = nextLichess;
  }

  const platform = existing.chess_platform;
  if (platform === 'chess.com' && chess_com_username !== undefined && nextChessCom) {
    nextChessUsername = nextChessCom;
  } else if (platform === 'lichess' && lichess_username !== undefined && nextLichess) {
    nextChessUsername = nextLichess;
  } else if (!platform && chess_com_username !== undefined && nextChessCom) {
    updates.chess_platform = 'chess.com';
    nextChessUsername = nextChessCom;
  } else if (!platform && lichess_username !== undefined && nextLichess && !nextChessCom) {
    updates.chess_platform = 'lichess';
    nextChessUsername = nextLichess;
  }

  if (chess_username !== undefined && nextChessUsername) {
    if (platform === 'chess.com' || updates.chess_platform === 'chess.com') {
      updates.chess_com_username = nextChessUsername;
      nextChessCom = nextChessUsername;
    } else if (platform === 'lichess' || updates.chess_platform === 'lichess') {
      updates.lichess_username = nextChessUsername;
      nextLichess = nextChessUsername;
    }
  }

  if (
    chess_username !== undefined ||
    nextChessUsername !== existing.chess_username
  ) {
    updates.chess_username = nextChessUsername;
  }

  if (Object.keys(updates).length === 0) {
    return res.json({ success: true, data: publicUser(existing) });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data: publicUser(data) });
};

/** Member changes their own password (requires current password). */
exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      success: false,
      error: { message: 'current_password and new_password are required' },
    });
  }

  if (String(new_password).trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: { message: 'New password must be at least 6 characters.' },
    });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, password_hash')
    .eq('id', id)
    .single();

  if (error || !user) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  const { ok } = await ensurePasswordHash(
    { id: user.id, password_hash: user.password_hash },
    current_password
  );

  if (!ok) {
    return res.status(401).json({
      success: false,
      error: { message: 'Current password is incorrect' },
    });
  }

  const password_hash = await hashPassword(String(new_password).trim());
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', id);

  if (updateError) {
    return res.status(400).json({ success: false, error: { message: updateError.message } });
  }

  res.json({ success: true, data: { id, message: 'Password updated' } });
};

/** Admin resets a member password to the platform default. */
exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const { admin_code } = req.body || {};

  // Soft gate: admin panel callers should send the admin code (same as login).
  if (!assertAdminCode(admin_code)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Valid admin code is required to reset passwords.' },
    });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', id)
    .single();

  if (error || !user) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  const password_hash = await hashDefaultPassword();
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash })
    .eq('id', id);

  if (updateError) {
    return res.status(400).json({ success: false, error: { message: updateError.message } });
  }

  res.json({
    success: true,
    data: {
      id,
      message: 'Password reset to the default password',
      default_password: getDefaultPassword(),
    },
  });
};
