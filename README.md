# TaskFlow Assignment

TaskFlow is a small full-stack task board built with React, Node.js, and SQLite. It supports viewing a seeded board, creating tasks, editing tasks, deleting tasks, moving tasks between columns, filtering by priority, and searching by title.

## Tech stack

- React with Vite for the frontend
- Node.js HTTP server for the backend
- SQLite through Node's built-in `node:sqlite` module
- Node's built-in test runner for backend tests

## Requirements

- Node.js 24 or newer
- npm

This project uses Node's built-in SQLite module to avoid native database package setup.

## Setup

Install dependencies:

```bash
npm install
```

Start both apps:

```bash
npm run dev
```

Open the frontend at:

```text
http://127.0.0.1:5173
```

The API runs at:

```text
http://127.0.0.1:4000
```

The database file is created automatically at `server/data/taskflow.sqlite` and is seeded on first run.

## Deploy on Render (optional)

Create a **Web Service** from this repo and use:

- **Root Directory:** leave empty
- **Build Command:** `NPM_CONFIG_PRODUCTION=false npm install && npm run build`
- **Start Command:** `npm start`
- **Environment variables (required):**
  - `NODE_VERSION` = `24` — without this, Render defaults to Node 20 and the build fails
  - `NPM_CONFIG_PRODUCTION` = `false`

There is also a `render.yaml` / `.node-version` in the repo. After changing env vars, trigger a **Manual Deploy**.

The server serves the API and the built React app from one URL. SQLite data on the free tier can reset when the service restarts or redeploys.

## Useful commands

Run backend tests:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

Reset and reseed the local database:

```bash
npm run seed
```

## Database

The schema is in `server/db/schema.sql` and seed data is in `server/db/seed.sql`.

The core tables are `boards`, `columns`, and `tasks`. Each table has a primary key, tasks reference columns, columns reference boards, and required task fields use `NOT NULL` plus a title check.

Required query 1, task count per column:

```sql
SELECT
  columns.id AS columnId,
  columns.name AS columnName,
  COUNT(tasks.id) AS taskCount
FROM columns
LEFT JOIN tasks ON tasks.column_id = columns.id
WHERE columns.board_id = ?
GROUP BY columns.id, columns.name, columns.position
ORDER BY columns.position ASC;
```

Required query 2, tasks with a given priority, newest first:

```sql
SELECT
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
ORDER BY datetime(tasks.created_at) DESC, tasks.id DESC;
```

The board endpoint also applies priority and search filtering in SQL during the task join instead of fetching everything and filtering in memory.

## API routes

- `GET /api/boards/1`
- `GET /api/boards/1?priority=High&search=launch`
- `GET /api/boards/1/task-counts`
- `GET /api/tasks/priority/High`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/move`
- `DELETE /api/tasks/:id`

## Tests

The backend tests cover:

- Creating a task with an empty title fails
- Moving a task updates its column and status
- The task-count database query returns expected rows for seed data

## Decisions and assumptions

- A task's status is represented by its `column_id`; the API returns the column name as `status`.
- Moving tasks uses a dropdown control instead of drag and drop so the core workflow stays reliable.
- SQLite is used as the real relational database because it is easy to run locally from a clean clone.
- The app assumes one seeded board for the assignment scope.

## With more time

- Add drag and drop after the dropdown workflow is fully stable.
- Add optimistic UI updates for task moves and deletes.
- Add frontend component tests around form validation and error states.
- Add a deployment target and environment-specific API configuration.

## Time spent

About 2 hours for the core implementation, plus a short polish pass for form validation and README write-up.

## What I learned

I used Node's built-in `node:sqlite` module instead of a separate native driver. That made local setup simpler from a clean clone, while still writing real SQL for schema, joins, and aggregate queries rather than filtering everything in application memory.
