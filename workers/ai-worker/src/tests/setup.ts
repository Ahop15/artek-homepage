/// <reference types="@cloudflare/vitest-pool-workers" />

/**
 * Vitest Global Setup
 * Runs before all tests to initialize D1 database schema
 */

import { beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import type { Env } from '../types';

// Type-safe access to test environment bindings
const testEnv = env as unknown as Env;

// Migration SQL
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS conversation_logs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Blockchain Core
  chain_id            TEXT NOT NULL,
  block_hash          TEXT NOT NULL,
  prev_hash           TEXT,
  block_index         INTEGER NOT NULL,

  -- Lookup Optimization
  context_hash        TEXT NOT NULL,

  -- Context & Messages
  context             TEXT NOT NULL,
  user_message        TEXT NOT NULL,
  assistant_response  TEXT NOT NULL,

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

CREATE INDEX IF NOT EXISTS idx_chain_id ON conversation_logs(chain_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_context_hash ON conversation_logs(context_hash);
CREATE INDEX IF NOT EXISTS idx_block_hash ON conversation_logs(block_hash);
CREATE INDEX IF NOT EXISTS idx_prev_hash ON conversation_logs(prev_hash);
CREATE INDEX IF NOT EXISTS idx_logs_created ON conversation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_ip_hash ON conversation_logs(ip_hash);
`;

// Run migration before all tests
beforeAll(async () => {
	const db = testEnv.AI_LOGS_DB;

	// Split by semicolon and execute each statement
	const statements = MIGRATION_SQL.split(';')
		.map((stmt) => stmt.trim())
		.filter((stmt) => stmt.length > 0);

	for (const statement of statements) {
		await db.prepare(statement).run();
	}

	console.log('D1 migration completed: conversation_logs table created');
});
