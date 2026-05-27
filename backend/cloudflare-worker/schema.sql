CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('classical', 'quantum')),
  ring_id TEXT NOT NULL,
  ring_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  value REAL NOT NULL CHECK (value >= 0 AND value <= 1),
  wins INTEGER,
  total INTEGER,
  sim_wins INTEGER,
  sim_total INTEGER,
  sim_value REAL CHECK (sim_value IS NULL OR (sim_value >= 0 AND sim_value <= 1)),
  strategy_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_lookup
ON leaderboard_entries (ring_id, type, value DESC, created_at ASC);
