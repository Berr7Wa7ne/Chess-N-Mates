const { supabase, supabaseAdmin } = require('../config/supabase');

const VALID_ROLES = ['admin', 'player'];

function normalizeRole(role) {
  if (!role) return 'player';
  return String(role).toLowerCase();
}

exports.registerUser = async (req, res) => {
  const { phone_number, whatsapp_id, display_name, role: rawRole } = req.body;

  if (!phone_number || !whatsapp_id || !display_name) {
    return res.status(400).json({
      success: false,
      error: { message: 'phone_number, whatsapp_id, and display_name are required' },
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

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{
      phone_number,
      whatsapp_id,
      display_name,
      role,
      email: `${phone_number}@temp.com`,
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
    .select('id, phone_number, display_name, role')
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
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ chess_username, chess_platform, chess_elo: 1200 })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};

exports.getUser = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { display_name, avatar_url } = req.body;
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ display_name, avatar_url })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};
