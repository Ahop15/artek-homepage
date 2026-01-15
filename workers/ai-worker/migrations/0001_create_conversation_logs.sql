-- noinspection SqlDialectInspectionForFile

-- Migration: Create conversation logs table
-- Version: 0001
-- Description: Blockchain-style conversation logging with EIP-712 TypedData integrity

CREATE TABLE IF NOT EXISTS conversation_logs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Blockchain Core
  chain_id            TEXT NOT NULL,     -- ethers.randomBytes(32), genesis'te üretilir
  block_hash          TEXT NOT NULL,     -- hash([user, asst] + prev_hash) via ethers TypedData
  prev_hash           TEXT,              -- Önceki block'un block_hash'i (genesis: null)
  block_index         INTEGER NOT NULL,  -- 0, 1, 2, ... (zincir sırası)

  -- Lookup Optimization
  context_hash        TEXT NOT NULL,     -- hash(full_context) - previous context lookup için

  -- Context & Messages
  context             TEXT NOT NULL,     -- Full conversation JSON
  user_message        TEXT NOT NULL,     -- Son user mesajı
  assistant_response  TEXT NOT NULL,     -- AI yanıtı

  -- Metadata
  locale              TEXT DEFAULT 'tr',
  ip_hash             TEXT,
  model               TEXT NOT NULL,
  tokens_in           INTEGER NOT NULL,
  tokens_out          INTEGER NOT NULL,
  latency_ms          INTEGER NOT NULL,
  tool_calls          TEXT,
  created_at          INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chain_id ON conversation_logs(chain_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_context_hash ON conversation_logs(context_hash);
CREATE INDEX IF NOT EXISTS idx_block_hash ON conversation_logs(block_hash);
CREATE INDEX IF NOT EXISTS idx_prev_hash ON conversation_logs(prev_hash);
CREATE INDEX IF NOT EXISTS idx_logs_created ON conversation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_ip_hash ON conversation_logs(ip_hash);