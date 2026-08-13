const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong. Please try again.");
  }

  return payload.data;
}

export const api = {
  getBoard({ priority = "All", search = "" } = {}) {
    const params = new URLSearchParams();
    if (priority !== "All") {
      params.set("priority", priority);
    }
    if (search.trim()) {
      params.set("search", search.trim());
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request(`/boards/1${suffix}`);
  },

  createTask(task) {
    return request("/tasks", {
      method: "POST",
      body: JSON.stringify(task)
    });
  },

  updateTask(taskId, task) {
    return request(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(task)
    });
  },

  moveTask(taskId, columnId) {
    return request(`/tasks/${taskId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ columnId })
    });
  },

  deleteTask(taskId) {
    return request(`/tasks/${taskId}`, {
      method: "DELETE"
    });
  }
};
