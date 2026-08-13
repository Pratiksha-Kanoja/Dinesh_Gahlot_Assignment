import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTask,
  deleteTask,
  getBoard,
  getTaskCountsByColumn,
  getTasksByPriority,
  moveTask,
  updateTask
} from "./queries.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function findClientDistPath() {
  const candidates = [
    join(moduleDir, "..", "..", "client", "dist"),
    join(process.cwd(), "client", "dist"),
    join(process.cwd(), "..", "client", "dist"),
    join(moduleDir, "..", "..", "..", "client", "dist")
  ];

  return candidates.map((path) => resolve(path)).find((path) => existsSync(path)) || null;
}

const clientDistPath = findClientDistPath();

if (clientDistPath) {
  console.info(`Serving frontend from ${clientDistPath}`);
} else {
  console.warn(
    "Frontend build not found (client/dist). API routes will work, but / will 404 until the client is built."
  );
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function resolveStaticPath(pathname) {
  if (!clientDistPath) {
    return null;
  }

  const relativePath =
    pathname === "/"
      ? "index.html"
      : normalize(pathname.replace(/^[/\\]+/, "")).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(clientDistPath, relativePath);

  if (!filePath.startsWith(`${clientDistPath}${sep}`) && filePath !== clientDistPath) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  const indexPath = join(clientDistPath, "index.html");
  if (existsSync(indexPath)) {
    return indexPath;
  }

  return null;
}

function tryServeStatic(pathname, response) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    return false;
  }

  response.writeHead(200, {
    "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
  return true;
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
        sendJson(response, 200, {
          data: {
            status: "ok",
            frontend: Boolean(clientDistPath)
          }
        });
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

      if (request.method === "GET" && tryServeStatic(pathname, response)) {
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
