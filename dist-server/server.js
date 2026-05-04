import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Pool } from "pg";
import "dotenv/config";
// Ensure Node has access to __dirname in ESM
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    throw new Error("DATABASE_URL must be set in the environment or .env file.");
}
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
});
async function initDatabase() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      description TEXT,
      action_date DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    await pool.query(`
    INSERT INTO notes (id, content) VALUES (1, '')
    ON CONFLICT (id) DO NOTHING;
  `);
}
const PORT = process.env.PORT || 3000;
async function startServer() {
    const app = express();
    const PORT = 3000;
    await initDatabase();
    app.use(express.json());
    // --- API ROUTES ---
    // 1. Schools
    app.get("/api/schools", async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM schools ORDER BY created_at DESC");
            res.json(result.rows);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.post("/api/schools", async (req, res) => {
        try {
            const { name } = req.body;
            if (!name)
                return res.status(400).json({ error: "Name is required" });
            const insertSchool = await pool.query("INSERT INTO schools (name) VALUES ($1) RETURNING *", [name]);
            const newSchool = insertSchool.rows[0];
            await pool.query("INSERT INTO history (school_id, action, description, action_date) VALUES ($1, $2, $3, $4)", [
                newSchool.id,
                "System",
                "School added to the system.",
                new Date().toISOString(),
            ]);
            res.status(201).json(newSchool);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get("/api/schools/:id", async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM schools WHERE id = $1", [req.params.id]);
            const school = result.rows[0];
            if (!school)
                return res.status(404).json({ error: "School not found" });
            res.json(school);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.put("/api/schools/:id", async (req, res) => {
        try {
            const { name } = req.body;
            if (!name)
                return res.status(400).json({ error: "Name is required" });
            const updateResult = await pool.query("UPDATE schools SET name = $1 WHERE id = $2 RETURNING *", [name, req.params.id]);
            if (updateResult.rowCount === 0)
                return res.status(404).json({ error: "School not found" });
            const updated = updateResult.rows[0];
            await pool.query("INSERT INTO history (school_id, action, description, action_date) VALUES ($1, $2, $3, $4)", [req.params.id, "System", `School renamed to ${name}`, new Date().toISOString()]);
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.delete("/api/schools/:id", async (req, res) => {
        try {
            await pool.query("DELETE FROM history WHERE school_id = $1", [req.params.id]);
            await pool.query("DELETE FROM tasks WHERE school_id = $1", [req.params.id]);
            const deleteResult = await pool.query("DELETE FROM schools WHERE id = $1", [req.params.id]);
            if (deleteResult.rowCount === 0)
                return res.status(404).json({ error: "School not found" });
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 2. Tasks
    app.get("/api/tasks", async (req, res) => {
        try {
            const { school_id } = req.query;
            let query = `
        SELECT tasks.*, schools.name AS school_name
        FROM tasks
        JOIN schools ON tasks.school_id = schools.id
      `;
            const params = [];
            if (school_id) {
                query += " WHERE tasks.school_id = $1";
                params.push(school_id);
            }
            query += " ORDER BY tasks.status DESC, tasks.position ASC, tasks.due_date ASC";
            const result = await pool.query(query, params);
            res.json(result.rows);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.put("/api/tasks/reorder", async (req, res) => {
        const client = await pool.connect();
        try {
            const { orderedIds } = req.body;
            if (!Array.isArray(orderedIds))
                return res.status(400).json({ error: "Invalid data" });
            await client.query("BEGIN");
            const updateStmt = "UPDATE tasks SET position = $1 WHERE id = $2";
            for (let index = 0; index < orderedIds.length; index++) {
                await client.query(updateStmt, [index, orderedIds[index]]);
            }
            await client.query("COMMIT");
            res.json({ success: true });
        }
        catch (err) {
            await client.query("ROLLBACK");
            res.status(500).json({ error: err.message });
        }
        finally {
            client.release();
        }
    });
    app.post("/api/tasks", async (req, res) => {
        try {
            const { school_id, type, due_date } = req.body;
            if (!school_id || !type || !due_date)
                return res.status(400).json({ error: "Missing required fields" });
            const insertResult = await pool.query("INSERT INTO tasks (school_id, type, due_date, status) VALUES ($1, $2, $3, $4) RETURNING *", [school_id, type, due_date, "Pending"]);
            res.status(201).json(insertResult.rows[0]);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.put("/api/tasks/:id/status", async (req, res) => {
        try {
            const { status } = req.body;
            if (!["Pending", "Completed"].includes(status))
                return res.status(400).json({ error: "Invalid status" });
            const updateResult = await pool.query("UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.id]);
            if (updateResult.rowCount === 0)
                return res.status(404).json({ error: "Task not found" });
            res.json(updateResult.rows[0]);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.put("/api/tasks/:id", async (req, res) => {
        try {
            const { type, due_date } = req.body;
            if (!type || !due_date)
                return res.status(400).json({ error: "Missing required fields" });
            const updateResult = await pool.query("UPDATE tasks SET type = $1, due_date = $2 WHERE id = $3 RETURNING *", [type, due_date, req.params.id]);
            if (updateResult.rowCount === 0)
                return res.status(404).json({ error: "Task not found" });
            res.json(updateResult.rows[0]);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.delete("/api/tasks/:id", async (req, res) => {
        try {
            const deleteResult = await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
            if (deleteResult.rowCount === 0)
                return res.status(404).json({ error: "Task not found" });
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 3. History
    app.get("/api/history/:schoolId", async (req, res) => {
        try {
            const result = await pool.query("SELECT * FROM history WHERE school_id = $1 ORDER BY action_date DESC, id DESC", [req.params.schoolId]);
            res.json(result.rows);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.post("/api/history", async (req, res) => {
        try {
            const { school_id, action, description, action_date } = req.body;
            if (!school_id || !action || !action_date)
                return res.status(400).json({ error: "Missing required fields" });
            const insertResult = await pool.query("INSERT INTO history (school_id, action, description, action_date) VALUES ($1, $2, $3, $4) RETURNING *", [school_id, action, description, action_date]);
            res.status(201).json(insertResult.rows[0]);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 4. Global Note
    app.get("/api/note", async (req, res) => {
        try {
            const result = await pool.query("SELECT content FROM notes WHERE id = 1");
            res.json(result.rows[0] || { content: "" });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.put("/api/note", async (req, res) => {
        try {
            const { content } = req.body;
            await pool.query("UPDATE notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [content || ""]);
            res.json({ success: true, content });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // --- VITE FRONTEND MIDDLEWARE ---
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
