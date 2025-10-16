
# Event Management API

Lightweight Node.js REST API for managing events and attendees. This repository (event-management-surefy) provides a small Express-based API using PostgreSQL for persistence. It includes a simple SQL migration in `migrations/init.sql` to create the required schema.

## Contents

- `server.js` — application entry (runs the Express server)
- `package.json` — Node.js metadata and dependencies
- `migrations/init.sql` — SQL used to create the initial database schema

## Requirements

- Node.js (v16+ recommended)
- npm (comes with Node.js)
- PostgreSQL server

## Quick start

1. Install dependencies

```powershell
cd path\to\event-management-api
npm install
```

2. Create a PostgreSQL database (example):

```powershell
# using psql interactively or a GUI - example psql command
psql -h localhost -U postgres -c "CREATE DATABASE event_management;"
```

3. Run the initial SQL migration to create tables

```powershell
# Replace connection options as needed (host, user, dbname)
psql -h localhost -U postgres -d event_management -f migrations/init.sql
```

4. Create an `.env` file in the project root with the environment variables the app expects. A minimal example using a single `DATABASE_URL`:

```
# .env
PORT=3000
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/event_management
```

If your project uses separate PG environment vars, set them instead (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT).

5. Start the server

```powershell
node server.js
# or, if you prefer, add a start script in package.json and run: npm start
```

The API will listen on the port defined by `PORT` (default 3000 in the example above).

## Database

The `migrations/init.sql` file contains the DDL for the initial schema. Inspect and adapt it before running on production systems.

## Environment variables

- `PORT` — HTTP port to listen on (default 3000)
- `DATABASE_URL` — full Postgres connection string (or use the PG* env vars)

## Development notes

- The project depends on these npm packages (see `package.json`): `express`, `pg`, `dotenv`, `express-validator`, `uuid`.
- If you plan to extend or deploy, add a `start` and `dev` script to `package.json` (for example using `nodemon` for local development).

## Example curl

```powershell
# GET health or root route (adjust path to the API implementation)
curl http://localhost:3000/
```

## Contributing

Contributions are welcome. Open issues or PRs with a clear description of the change.

## License & contact

This repository does not declare an author in `package.json`. Add an `author` field and LICENSE file if you intend to publish the project.

Owner: MOHDARSHADHACKER / Repository: event-management-surefy
