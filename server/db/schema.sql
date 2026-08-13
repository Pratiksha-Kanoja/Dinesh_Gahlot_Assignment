PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  UNIQUE (board_id, name),
  UNIQUE (board_id, position)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_columns_board_position
  ON columns (board_id, position);

CREATE INDEX IF NOT EXISTS idx_tasks_column_created
  ON tasks (column_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_priority_created
  ON tasks (priority, created_at DESC);
