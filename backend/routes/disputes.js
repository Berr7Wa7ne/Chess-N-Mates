const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('disputes').select('*');
  if (error) return res.status(400).json({ success: false, error: { message: error.message } });
  res.json({ success: true, data });
});

module.exports = router;
