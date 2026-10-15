# FixFlow - Smart Fault Reporting & Resolution System

Report equipment faults, track them on a dashboard, and update their status until they are resolved.

**Stack:** HTML + CSS + vanilla JS, Node.js + Express, MySQL (`mysql2`).

## Setup

1. Install Node.js (v18+) and MySQL, and make sure MySQL is running.
2. In this folder:
   ```bash
   npm install
   cp .env.example .env      # then edit .env and set DB_PASSWORD
   npm start
   ```
3. Open http://localhost:3000

On first start the server creates the `fixflow` database, the `faults` table, and six sample faults.
Prefer doing it by hand? Run `db/schema.sql` (and optionally `db/seed.sql`) in MySQL, and set `SEED=false` in `.env`.

## Pages

- `/` (`index.html`): report a fault (equipment, location, description, priority)
- `/dashboard.html`: summary counts, filters, search, status updates

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/faults` | Submit a new fault |
| GET | `/api/faults?status=&priority=&q=` | List faults, High priority first, Resolved last |
| PUT | `/api/faults/:id/status` | Set status: `Open`, `In Progress`, `Resolved` |
| GET | `/api/summary` | Total, open, in progress, resolved, pending, urgent counts |

## Notes

- All queries use `?` placeholders (no SQL injection); input is validated in the browser and on the server.
- Dashboard output is HTML-escaped (no XSS from fault descriptions).
- Troubleshooting: `ER_ACCESS_DENIED_ERROR` means the DB_USER / DB_PASSWORD in `.env` is wrong. If MySQL 8 reports an auth plugin problem, run:
  `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';`
