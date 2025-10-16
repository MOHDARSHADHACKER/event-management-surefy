// ===== Event Management API using PostgreSQL =====
const express = require("express");
const { Pool } = require("pg");
const { body, param, validationResult } = require("express-validator");
require("dotenv").config();

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper to check validation errors
const checkErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};



// 2️⃣ List Upcoming Events

app.post(
  "/api/events",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("datetime").notEmpty().withMessage("Datetime is required").isISO8601(),
    body("location").notEmpty().withMessage("Location is required"),
    body("capacity")
      .isInt({ min: 1, max: 1000 })
      .withMessage("Capacity must be 1-1000"),
  ],
  checkErrors,
  async (req, res) => {
    try {
      let { title, datetime, location, capacity } = req.body;

      // Convert any valid datetime string to ISO format
      datetime = new Date(datetime).toISOString();

      const q = await pool.query(
        "INSERT INTO events (title, datetime, location, capacity) VALUES ($1,$2,$3,$4) RETURNING id",
        [title, datetime, location, capacity]
      );

      res.status(201).json({ eventId: q.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);





// 3️⃣ Get Event Details
app.get("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await pool.query(
      "SELECT id, title, datetime, location, capacity, created_at, updated_at FROM events WHERE id=$1",
      [id]
    );

    if (event.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event.rows[0]); // Just return the event object
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 4️⃣ Register for Event
app.post(
  "/api/events/:id/register",
  [param("id").isInt({ min: 1 }), body("name").notEmpty(), body("email").isEmail()],
  checkErrors,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id: eventId } = req.params;
      const { name, email } = req.body;
      await client.query("BEGIN");

      const ev = await client.query("SELECT * FROM events WHERE id=$1 FOR UPDATE", [eventId]);
      if (ev.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Event not found" });
      }

      const event = ev.rows[0];
      if (new Date(event.datetime) < new Date()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Cannot register for past event" });
      }

      const count = await client.query(
        "SELECT COUNT(*)::int AS c FROM registrations WHERE event_id=$1",
        [eventId]
      );
      if (count.rows[0].c >= event.capacity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Event is full" });
      }

      let user = await client.query("SELECT * FROM users WHERE email=$1", [email]);
      let userId;
      if (user.rowCount === 0) {
        const u = await client.query(
          "INSERT INTO users (name,email) VALUES ($1,$2) RETURNING id",
          [name, email]
        );
        userId = u.rows[0].id;
      } else {
        userId = user.rows[0].id;
      }

      const dup = await client.query(
        "SELECT * FROM registrations WHERE user_id=$1 AND event_id=$2",
        [userId, eventId]
      );
      if (dup.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Already registered" });
      }

      await client.query("INSERT INTO registrations (user_id,event_id) VALUES ($1,$2)", [
        userId,
        eventId,
      ]);
      await client.query("COMMIT");

      res.status(201).json({ message: "Registration successful" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

// 5️⃣ Cancel Registration
app.post(
  "/api/events/:id/cancel",
  [param("id").isInt({ min: 1 }), body("email").isEmail()],
  checkErrors,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id: eventId } = req.params;
      const { email } = req.body;

      await client.query("BEGIN");
      const user = await client.query("SELECT id FROM users WHERE email=$1", [email]);
      if (user.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }

      const del = await client.query(
        "DELETE FROM registrations WHERE user_id=$1 AND event_id=$2 RETURNING *",
        [user.rows[0].id, eventId]
      );
      if (del.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "User not registered for this event" });
      }

      await client.query("COMMIT");
      res.json({ message: "Registration cancelled" });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

// 6️⃣ Event Stats
app.get("/api/events/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;
    const ev = await pool.query("SELECT capacity FROM events WHERE id=$1", [id]);
    if (ev.rowCount === 0) return res.status(404).json({ error: "Event not found" });

    const cap = ev.rows[0].capacity;
    const regs = await pool.query(
      "SELECT COUNT(*)::int AS total FROM registrations WHERE event_id=$1",
      [id]
    );
    const total = regs.rows[0].total;
    const remaining = cap - total;
    const percent = ((total / cap) * 100).toFixed(2);

    res.json({ totalRegistrations: total, remainingCapacity: remaining, percentUsed: percent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all events (no registration count)
app.get("/api/events", async (req, res) => {
  try {
    const q = await pool.query(
      "SELECT id, title, datetime, location, capacity, created_at, updated_at FROM events ORDER BY datetime ASC"
    );
    res.json(q.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
