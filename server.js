require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'fixflow';

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let pool;

/* ---------- Database bootstrap: creates DB + table + sample data ---------- */
async function initDb() {
  const conn = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  const boot = await mysql.createConnection(conn);
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await boot.end();

  pool = mysql.createPool({
    ...conn,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS faults (
      id INT AUTO_INCREMENT PRIMARY KEY,
      equipment_name VARCHAR(100) NOT NULL,
      location VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
      status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
      reported_by VARCHAR(100) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_priority (priority)
    )
  `);

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM faults');
  if (total === 0 && process.env.SEED !== 'false') {
    const rows = [
      ['Projector', 'Seminar Hall 2', 'No display output from the HDMI port. Lamp indicator keeps blinking red.', 'High', 'Open', 'Dept. of CSE', 3],
      ['Ceiling Fan', 'Room B-204', 'Fan makes a loud grinding noise and wobbles at high speed.', 'Medium', 'In Progress', 'Class Rep', 24],
      ['Lab PC #14', 'Computer Lab 3', 'System restarts randomly during compilation. Possible PSU problem.', 'High', 'Open', 'Lab Assistant', 5],
      ['Water Purifier', 'Ground Floor Corridor', 'Water flow is very slow and the filter light is on.', 'Low', 'Open', null, 48],
      ['Oscilloscope', 'Electronics Lab', 'Channel 2 shows a flat line even with a known good signal.', 'Medium', 'Resolved', 'Lab Technician', 96],
      ['Lathe Machine', 'Workshop Block', 'Spindle belt slipping under load. Unsafe to operate.', 'High', 'In Progress', 'Workshop In-charge', 2],
    ];
    for (const r of rows) {
      await pool.query(
        `INSERT INTO faults (equipment_name, location, description, priority, status, reported_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
        r
      );
    }
    console.log('Inserted sample faults.');
  }
}

/* ---------- Helpers ---------- */
const clean = (v) => (typeof v === 'string' ? v.trim() : '');

function validateFault(body) {
  const errors = {};
  const equipment_name = clean(body.equipment_name);
  const location = clean(body.location);
  const description = clean(body.description);
  const reported_by = clean(body.reported_by);
  const priority = clean(body.priority) || 'Medium';

  if (!equipment_name) errors.equipment_name = 'Enter the equipment name.';
  else if (equipment_name.length > 100) errors.equipment_name = 'Keep it under 100 characters.';

  if (!location) errors.location = 'Enter where the equipment is.';
  else if (location.length > 100) errors.location = 'Keep it under 100 characters.';

  if (!description) errors.description = 'Describe what is wrong.';
  else if (description.length < 10) errors.description = 'Add a little more detail (at least 10 characters).';
  else if (description.length > 2000) errors.description = 'Keep it under 2000 characters.';

  if (reported_by.length > 100) errors.reported_by = 'Keep it under 100 characters.';
  if (!PRIORITIES.includes(priority)) errors.priority = 'Choose Low, Medium or High.';

  return { errors, values: { equipment_name, location, description, reported_by: reported_by || null, priority } };
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  });

/* ---------- API ---------- */

// Create a fault report
app.post('/api/faults', wrap(async (req, res) => {
  const { errors, values } = validateFault(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  const [result] = await pool.query(
    `INSERT INTO faults (equipment_name, location, description, priority, reported_by) VALUES (?, ?, ?, ?, ?)`,
    [values.equipment_name, values.location, values.description, values.priority, values.reported_by]
  );
  const [[fault]] = await pool.query('SELECT * FROM faults WHERE id = ?', [result.insertId]);
  res.status(201).json(fault);
}));

// List faults (filters: status, priority, q). High priority first, resolved last.
app.get('/api/faults', wrap(async (req, res) => {
  const where = [];
  const params = [];
  const { status, priority, q } = req.query;

  if (status) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status filter.' });
    where.push('status = ?'); params.push(status);
  }
  if (priority) {
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority filter.' });
    where.push('priority = ?'); params.push(priority);
  }
  if (q && clean(q)) {
    where.push('(equipment_name LIKE ? OR location LIKE ? OR description LIKE ?)');
    const like = `%${clean(q)}%`;
    params.push(like, like, like);
  }

  const sql = `
    SELECT * FROM faults
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY (status = 'Resolved') ASC,
             FIELD(priority, 'High', 'Medium', 'Low'),
             created_at DESC`;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}));

// Update status
app.put('/api/faults/:id/status', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body && req.body.status);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid fault id.' });
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Status must be Open, In Progress or Resolved.' });

  const [result] = await pool.query('UPDATE faults SET status = ? WHERE id = ?', [status, id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Fault not found.' });
  const [[fault]] = await pool.query('SELECT * FROM faults WHERE id = ?', [id]);
  res.json(fault);
}));

// Summary counts
app.get('/api/summary', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT status, COUNT(*) AS n FROM faults GROUP BY status');
  const [[{ urgent }]] = await pool.query(
    "SELECT COUNT(*) AS urgent FROM faults WHERE priority = 'High' AND status <> 'Resolved'"
  );
  const summary = { total: 0, open: 0, inProgress: 0, resolved: 0, pending: 0, urgent };
  for (const r of rows) {
    summary.total += r.n;
    if (r.status === 'Open') summary.open = r.n;
    if (r.status === 'In Progress') summary.inProgress = r.n;
    if (r.status === 'Resolved') summary.resolved = r.n;
  }
  summary.pending = summary.open + summary.inProgress;
  res.json(summary);
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

/* ---------- Start ---------- */
initDb()
  .then(() => app.listen(PORT, () => console.log(`FixFlow running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('\nCould not connect to MySQL:', err.message);
    console.error('Check DB_USER / DB_PASSWORD in your .env file and that MySQL is running.\n');
    process.exit(1);
  });
