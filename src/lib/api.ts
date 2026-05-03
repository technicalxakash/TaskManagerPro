export interface School {
  id: number;
  name: string;
  created_at: string;
}

export interface Task {
  id: number;
  school_id: number;
  type: string;
  due_date: string;
  status: "Pending" | "Completed";
  position?: number;
  school_name?: string;
}

export interface HistoryEntry {
  id: number;
  school_id: number;
  action: string;
  description: string;
  action_date: string;
}

const API_BASE = '/api';

export const api = {
  schools: {
    list: async (): Promise<School[]> => {
      const res = await fetch(`${API_BASE}/schools`);
      return res.json();
    },
    get: async (id: number): Promise<School> => {
      const res = await fetch(`${API_BASE}/schools/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    create: async (name: string): Promise<School> => {
      const res = await fetch(`${API_BASE}/schools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    update: async (id: number, name: string): Promise<School> => {
      const res = await fetch(`${API_BASE}/schools/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_BASE}/schools/${id}`, {
        method: "DELETE",
      });
    }
  },
  tasks: {
    list: async (schoolId?: number): Promise<Task[]> => {
      const url = schoolId ? `${API_BASE}/tasks?school_id=${schoolId}` : `${API_BASE}/tasks`;
      const res = await fetch(url);
      return res.json();
    },
    create: async (school_id: number, type: string, due_date: string): Promise<Task> => {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id, type, due_date }),
      });
      return res.json();
    },
    updateStatus: async (id: number, status: "Pending" | "Completed"): Promise<Task> => {
      const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    update: async (id: number, type: string, due_date: string): Promise<Task> => {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, due_date }),
      });
      return res.json();
    },
    reorder: async (orderedIds: number[]): Promise<void> => {
      await fetch(`${API_BASE}/tasks/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
    },
    delete: async (id: number): Promise<void> => {
      await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
      });
    }
  },
  history: {
    list: async (schoolId: number): Promise<HistoryEntry[]> => {
      const res = await fetch(`${API_BASE}/history/${schoolId}`);
      return res.json();
    },
    create: async (school_id: number, action: string, description: string, action_date: string): Promise<HistoryEntry> => {
      const res = await fetch(`${API_BASE}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id, action, description, action_date }),
      });
      return res.json();
    }
  },
  note: {
    get: async (): Promise<{ content: string }> => {
      const res = await fetch(`${API_BASE}/note`);
      return res.json();
    },
    update: async (content: string): Promise<void> => {
      await fetch(`${API_BASE}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }
  }
};
