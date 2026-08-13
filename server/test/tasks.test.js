import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { getTaskById, getTaskCountsByColumn } from "../src/queries.js";

async function startTestServer(t) {
  const db = createDatabase(":memory:");
  const server = createServer(createApp(db));

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });

  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    db
  };
}

test("creating a task with no title fails", async (t) => {
  const { baseUrl } = await startTestServer(t);

  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "   ",
      columnId: 1,
      priority: "High"
    })
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Task title is required.");
});

test("moving a task updates its status and column", async (t) => {
  const { baseUrl, db } = await startTestServer(t);

  const response = await fetch(`${baseUrl}/api/tasks/1/move`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId: 2 })
  });
  const payload = await response.json();
  const movedTask = getTaskById(db, 1);

  assert.equal(response.status, 200);
  assert.equal(payload.data.task.columnId, 2);
  assert.equal(payload.data.task.status, "In Progress");
  assert.equal(movedTask.columnId, 2);
  assert.equal(movedTask.status, "In Progress");
});

test("tasks per column query returns counts for seed data", () => {
  const db = createDatabase(":memory:");
  const counts = getTaskCountsByColumn(db, 1);
  db.close();

  assert.deepEqual(
    counts.map((count) => ({
      columnName: count.columnName,
      taskCount: count.taskCount
    })),
    [
      { columnName: "To Do", taskCount: 2 },
      { columnName: "In Progress", taskCount: 1 },
      { columnName: "Done", taskCount: 1 }
    ]
  );
});
