const { supabase } = require('../config/supabase');

exports.createCompetition = async (req, res) => {
  const { name, description, tournament_type, max_participants, rounds, min_elo, max_elo, created_by } = req.body;
  const { data, error } = await supabase
    .from('competitions')
    .insert([{ name, description, tournament_type, max_participants, rounds, min_elo, max_elo, created_by }])
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.status(201).json({ success: true, data });
};

exports.getCompetitions = async (req, res) => {
  const { data, error } = await supabase.from('competitions').select('*');
  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};

exports.getCompetition = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('competitions').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
};
