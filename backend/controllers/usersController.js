const { supabase, supabaseAdmin } = require('../config/supabase');

const VALID_ROLES = ['admin', 'player'];

function normalizeRole(role) {
  if (!role) return 'player';
  return String(role).toLowerCase();
}

exports.registerUser = async (req, res) => {
  const { 
    phone_number, 
    whatsapp_id, 
    display_name, 
    role: rawRole,
    chess_platform,
    chess_com_username,
    lichess_username 
  } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      success: false,
      error: { message: 'phone_number is required' },
    });
  }

  const role = normalizeRole(rawRole);
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid role. Must be admin or player.' },
    });
  }

  const { data: existingUser, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone_number', phone_number)
    .maybeSingle();

  if (lookupError) {
    return res.status(400).json({ success: false, error: { message: lookupError.message } });
  }

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: { message: 'Phone number already registered' },
    });
  }

  // Determine display_name based on chess platform
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

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{
      phone_number,
      whatsapp_id: whatsapp_id || null,
      display_name: finalDisplayName,
      role,
      email: `${phone_number}@temp.com`,
      chess_platform: chess_platform || null,
      chess_com_username: chess_platform === 'chess.com' ? chess_com_username : null,
      lichess_username: chess_platform === 'lichess' ? lichess_username : null,
    }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.status(201).json({ success: true, data });
};

exports.loginUser = async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({
      success: false,
      error: { message: 'phone_number is required' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, phone_number, display_name, role, chess_platform, chess_username, chess_com_username, lichess_username, chess_elo, whatsapp_phone, avatar_url'
    )
    .eq('phone_number', phone_number.trim())
    .maybeSingle();

  if (error) {
    return res.status(400).json({ success: false, error: { message: error.message } });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      error: { message: 'No account found for this phone number' },
    });
  }

  res.json({ success: true, data });
};

exports.registerChess = async (req, res) => {
  const { id } = req.params;
  const { chess_username, chess_platform } = req.body;

  if (!chess_username || !chess_platform) {
    return res.status(400).json({ success: false, error: { message: 'chess_username and chess_platform are required' } });
  }

  const updates = {
    chess_username,
    chess_platform,
    chess_elo: 1200,
  };

  // Also update chess_com_username and display_name for chess.com users
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
  res.json({ success: true, data });
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
  res.json({ success: true, data });
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

  // Same CNM account (id) stays linked to tournament history — only update handles.
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

  // Keep primary chess_username aligned with the account's tournament platform.
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

  // Editing community Username keeps the linked platform handle in sync.
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
    return res.json({ success: true, data: existing });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};
