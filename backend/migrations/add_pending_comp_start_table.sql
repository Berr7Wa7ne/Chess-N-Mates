-- Migration: Add pending_comp_start table for bot !comp-start two-step flow
-- This stores the pending competition type when an admin runs !comp-start
-- but hasn't yet provided the competition details.

CREATE TABLE IF NOT EXISTS pending_comp_start (
  id BIGSERIAL PRIMARY KEY,
  whatsapp_id VARCHAR(100) NOT NULL,
  command VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (whatsapp_id)
);

CREATE INDEX IF NOT EXISTS idx_pc_whatsapp_id ON pending_comp_start(whatsapp_id);