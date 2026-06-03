const { supabase } = require('../config/supabase');

exports.registerUser = async (req, res) => {
  const { phone_number, whatsapp_id, display_name } = req.body;
  const { data, error } = await supabase
    .from('users')
    .insert([{ phone_number, whatsapp_id, display_name, email: `${phone_number}@temp.com` }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.status(201).json({ success: true, data });
};

exports.registerChess = async (req, res) => {
  const { id } = req.params;
  const { chess_username, chess_platform } = req.body;
  const { data, error } = await supabase
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
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { display_name, avatar_url } = req.body;
  const { data, error } = await supabase
    .from('users')
    .update({ display_name, avatar_url })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};
