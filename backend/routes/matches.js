const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).single();
  if (error) return res.status(404).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
});

module.exports = router;
