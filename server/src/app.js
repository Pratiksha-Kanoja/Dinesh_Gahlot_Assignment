import {
  createTask,
  deleteTask,
  getBoard,
  getTaskCountsByColumn,
  getTasksByPriority,
  moveTask,
  updateTask
} from "./queries.js";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function matchId(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match[1] : null;
}

export function createApp(db) {
  return async function handler(request, response) {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      const url = new URL(request.url, "http://localhost");
      const { pathname, searchParams } = url;

      if (request.method === "GET" && pathname === "/api/health") {
        sendJson(response, 200, { data: { status: "ok" } });
        return;
      }

      const boardId = matchId(pathname, /^\/api\/boards\/(\d+)$/);
      if (request.method === "GET" && boardId) {
        const board = getBoard(db, boardId, {
          priority: searchParams.get("priority"),
          search: searchParams.get("search")
        });
        sendJson(response, 200, { data: { board } });
        return;
      }

      const countsBoardId = matchId(pathname, /^\/api\/boards\/(\d+)\/task-counts$/);
      if (request.method === "GET" && countsBoardId) {
        const counts = getTaskCountsByColumn(db, countsBoardId);
        sendJson(response, 200, { data: { counts } });
        return;
      }

      const priority = matchId(pathname, /^\/api\/tasks\/priority\/(Low|Medium|High)$/);
      if (request.method === "GET" && priority) {
        const tasks = getTasksByPriority(db, priority);
        sendJson(response, 200, { data: { tasks } });
        return;
      }

      if (request.method === "POST" && pathname === "/api/tasks") {
        const task = createTask(db, await readJson(request));
        sendJson(response, 201, { data: { task } });
        return;
      }

      const taskId = matchId(pathname, /^\/api\/tasks\/(\d+)$/);
      if (request.method === "PUT" && taskId) {
        const task = updateTask(db, taskId, await readJson(request));
        sendJson(response, 200, { data: { task } });
        return;
      }

      if (request.method === "DELETE" && taskId) {
        const deleted = deleteTask(db, taskId);
        sendJson(response, 200, { data: { deleted } });
        return;
      }

      const moveTaskId = matchId(pathname, /^\/api\/tasks\/(\d+)\/move$/);
      if (request.method === "PATCH" && moveTaskId) {
        const task = moveTask(db, moveTaskId, await readJson(request));
        sendJson(response, 200, { data: { task } });
        return;
      }

      sendJson(response, 404, { error: "Route not found." });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message =
        statusCode >= 500 ? "Something went wrong. Please try again." : error.message;
      sendJson(response, statusCode, { error: message });
    }
  };
}
