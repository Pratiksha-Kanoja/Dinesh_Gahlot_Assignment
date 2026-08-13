export const PRIORITIES = ["Low", "Medium", "High"];

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${label} must be a positive integer.`);
  }
  return id;
}

function normalizeTitle(title) {
  return typeof title === "string" ? title.trim() : "";
}

function normalizeDescription(description) {
  if (typeof description !== "string") {
    return null;
  }
  const trimmed = description.trim();
  return trimmed || null;
}

function normalizePriority(priority = "Medium") {
  const value = priority || "Medium";
  if (!PRIORITIES.includes(value)) {
    throw httpError(400, "Priority must be Low, Medium, or High.");
  }
  return value;
}

function requireTitle(title) {
  const normalized = normalizeTitle(title);
  if (!normalized) {
    throw httpError(400, "Task title is required.");
  }
  return normalized;
}

function getColumn(db, columnId) {
  return db
    .prepare(
      `SELECT columns.id, columns.name, columns.board_id AS boardId
       FROM columns
       WHERE columns.id = ?`
    )
    .get(columnId);
}

export function getBoard(db, boardId, filters = {}) {
  const id = toId(boardId, "Board id");
  const priority =
    filters.priority && filters.priority !== "All"
      ? normalizePriority(filters.priority)
      : null;
  const search = typeof filters.search === "string" && filters.search.trim()
    ? filters.search.trim()
    : null;

  const board = db
    .prepare(
      `SELECT id, name, created_at AS createdAt
       FROM boards
       WHERE id = ?`
    )
    .get(id);

  if (!board) {
    throw httpError(404, "Board not found.");
  }

  const rows = db
    .prepare(
      `SELECT
         columns.id AS columnId,
         columns.name AS columnName,
         columns.position AS columnPosition,
         tasks.id AS taskId,
         tasks.title,
         tasks.description,
         tasks.priority,
         tasks.created_at AS createdAt,
         tasks.updated_at AS updatedAt
       FROM columns
       LEFT JOIN tasks
         ON tasks.column_id = columns.id
        AND (? IS NULL OR tasks.priority = ?)
        AND (? IS NULL OR lower(tasks.title) LIKE '%' || lower(?) || '%')
       WHERE columns.board_id = ?
       ORDER BY columns.position ASC, datetime(tasks.created_at) DESC, tasks.id DESC`
    )
    .all(priority, priority, search, search, id);

  const counts = getTaskCountsByColumn(db, id);
  const countsByColumnId = new Map(
    counts.map((count) => [count.columnId, count.taskCount])
  );
  const columns = [];
  const columnsById = new Map();

  for (const row of rows) {
    if (!columnsById.has(row.columnId)) {
      const column = {
        id: row.columnId,
        name: row.columnName,
        position: row.columnPosition,
        taskCount: countsByColumnId.get(row.columnId) || 0,
        tasks: []
      };
      columnsById.set(row.columnId, column);
      columns.push(column);
    }

    if (row.taskId) {
      columnsById.get(row.columnId).tasks.push({
        id: row.taskId,
        title: row.title,
        description: row.description,
        priority: row.priority,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        columnId: row.columnId,
        status: row.columnName
      });
    }
  }

  return { ...board, columns };
}

export function getTaskCountsByColumn(db, boardId) {
  const id = toId(boardId, "Board id");
  return db
    .prepare(
      `SELECT
         columns.id AS columnId,
         columns.name AS columnName,
         COUNT(tasks.id) AS taskCount
       FROM columns
       LEFT JOIN tasks ON tasks.column_id = columns.id
       WHERE columns.board_id = ?
       GROUP BY columns.id, columns.name, columns.position
       ORDER BY columns.position ASC`
    )
    .all(id);
}

export function getTasksByPriority(db, priority) {
  const normalizedPriority = normalizePriority(priority);
  return db
    .prepare(
      `SELECT
         tasks.id,
         tasks.title,
         tasks.description,
         tasks.priority,
         tasks.created_at AS createdAt,
         columns.id AS columnId,
         columns.name AS status,
         boards.id AS boardId,
         boards.name AS boardName
       FROM tasks
       JOIN columns ON columns.id = tasks.column_id
       JOIN boards ON boards.id = columns.board_id
       WHERE tasks.priority = ?
       ORDER BY datetime(tasks.created_at) DESC, tasks.id DESC`
    )
    .all(normalizedPriority);
}

export function getTaskById(db, taskId) {
  const id = toId(taskId, "Task id");
  const task = db
    .prepare(
      `SELECT
         tasks.id,
         tasks.title,
         tasks.description,
         tasks.priority,
         tasks.created_at AS createdAt,
         tasks.updated_at AS updatedAt,
         columns.id AS columnId,
         columns.name AS status
       FROM tasks
       JOIN columns ON columns.id = tasks.column_id
       WHERE tasks.id = ?`
    )
    .get(id);

  if (!task) {
    throw httpError(404, "Task not found.");
  }

  return task;
}

export function createTask(db, input) {
  const title = requireTitle(input?.title);
  const priority = normalizePriority(input?.priority);
  const columnId = toId(input?.columnId, "Column id");
  const description = normalizeDescription(input?.description);

  if (!getColumn(db, columnId)) {
    throw httpError(400, "Column not found.");
  }

  const result = db
    .prepare(
      `INSERT INTO tasks (column_id, title, description, priority)
       VALUES (?, ?, ?, ?)`
    )
    .run(columnId, title, description, priority);

  return getTaskById(db, result.lastInsertRowid);
}

export function updateTask(db, taskId, input) {
  const id = toId(taskId, "Task id");
  getTaskById(db, id);

  const title = requireTitle(input?.title);
  const priority = normalizePriority(input?.priority);
  const description = normalizeDescription(input?.description);

  db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(title, description, priority, id);

  return getTaskById(db, id);
}

export function moveTask(db, taskId, input) {
  const id = toId(taskId, "Task id");
  const columnId = toId(input?.columnId, "Column id");

  getTaskById(db, id);

  if (!getColumn(db, columnId)) {
    throw httpError(400, "Column not found.");
  }

  db.prepare(
    `UPDATE tasks
     SET column_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(columnId, id);

  return getTaskById(db, id);
}

export function deleteTask(db, taskId) {
  const id = toId(taskId, "Task id");
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

  if (result.changes === 0) {
    throw httpError(404, "Task not found.");
  }

  return { id };
}
