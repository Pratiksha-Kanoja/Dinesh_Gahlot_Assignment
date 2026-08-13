import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const priorities = ["Low", "Medium", "High"];

const emptyTask = {
  title: "",
  description: "",
  priority: "Medium",
  columnId: ""
};

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function App() {
  const [board, setBoard] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyTask);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const columns = board?.columns || [];

  const loadBoard = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getBoard({ priority: priorityFilter, search });
      setBoard(data.board);
      setError("");
      setForm((current) => ({
        ...current,
        columnId: current.columnId || data.board.columns[0]?.id || ""
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [priorityFilter, search]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const visibleTaskCount = useMemo(
    () => columns.reduce((total, column) => total + column.tasks.length, 0),
    [columns]
  );

  async function handleCreateTask(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.createTask({
        ...form,
        columnId: Number(form.columnId)
      });
      setForm({
        ...emptyTask,
        columnId: form.columnId
      });
      await loadBoard();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateTask(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.updateTask(editingTaskId, editDraft);
      setEditingTaskId(null);
      await loadBoard();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveTask(taskId, columnId) {
    try {
      await api.moveTask(taskId, Number(columnId));
      await loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.deleteTask(taskId);
      await loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditing(task) {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      columnId: task.columnId
    });
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">TaskFlow</p>
          <h1>{board?.name || "Team Board"}</h1>
        </div>
        <div className="summary">
          <strong>{visibleTaskCount}</strong>
          <span>visible tasks</span>
        </div>
      </section>

      {error ? (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="toolbar" aria-label="Board filters">
        <label>
          Priority
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="All">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Task title"
          />
        </label>
      </section>

      <section className="create-row" aria-label="Create task">
        <form className="task-form" onSubmit={handleCreateTask}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Write the next task"
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              placeholder="Optional details"
              rows="2"
            />
          </label>
          <div className="form-grid">
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value
                  }))
                }
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={form.columnId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    columnId: event.target.value
                  }))
                }
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Add task"}
          </button>
        </form>
      </section>

      {isLoading && !board ? (
        <p className="loading">Loading board...</p>
      ) : (
        <section className="board" aria-label="Task board">
          {columns.map((column) => (
            <article className="column" key={column.id}>
              <header className="column-header">
                <h2>{column.name}</h2>
                <span>{column.taskCount}</span>
              </header>

              <div className="task-list">
                {column.tasks.length === 0 ? (
                  <p className="empty-state">No matching tasks.</p>
                ) : (
                  column.tasks.map((task) => (
                    <article className="task-card" key={task.id}>
                      {editingTaskId === task.id ? (
                        <form className="edit-form" onSubmit={handleUpdateTask}>
                          <label>
                            Title
                            <input
                              value={editDraft.title}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  title: event.target.value
                                }))
                              }
                            />
                          </label>
                          <label>
                            Description
                            <textarea
                              value={editDraft.description}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  description: event.target.value
                                }))
                              }
                              rows="2"
                            />
                          </label>
                          <label>
                            Priority
                            <select
                              value={editDraft.priority}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  priority: event.target.value
                                }))
                              }
                            >
                              {priorities.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="actions">
                            <button type="submit" disabled={isSaving}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setEditingTaskId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="task-card-header">
                            <h3>{task.title}</h3>
                            <span className={`priority ${task.priority.toLowerCase()}`}>
                              {task.priority}
                            </span>
                          </div>
                          {task.description ? <p>{task.description}</p> : null}
                          <div className="task-meta">
                            <span>{formatDate(task.createdAt)}</span>
                            <label>
                              Move
                              <select
                                value={task.columnId}
                                onChange={(event) =>
                                  handleMoveTask(task.id, event.target.value)
                                }
                              >
                                {columns.map((targetColumn) => (
                                  <option key={targetColumn.id} value={targetColumn.id}>
                                    {targetColumn.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="actions">
                            <button type="button" onClick={() => startEditing(task)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default App;
