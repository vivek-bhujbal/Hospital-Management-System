# Database reset and Super Admin bootstrap

The application uses the MySQL schema named by `DATABASE_URL` (and by
`MYSQL_DATABASE` in Docker Compose). Normal startup runs Alembic and an
idempotent Super Admin bootstrap. It never drops data.

## Required private environment variables

Set these in the ignored root `.env` before starting Docker:

```env
APP_ENV=development
SUPER_ADMIN_EMAIL=your-super-admin-email@example.com
SUPER_ADMIN_PASSWORD=your-strong-private-password
SUPER_ADMIN_NAME=Super Admin
```

The password must be 8-72 UTF-8 bytes and contain uppercase, lowercase,
numeric, and special characters. It is read only by backend containers and is
stored in MySQL only as a bcrypt hash. The public frontend build receives only
`NEXT_PUBLIC_API_URL`; it never receives the Super Admin variables.

## Normal startup (non-destructive)

```powershell
docker compose up --build -d
```

Startup performs `alembic upgrade head`, then creates or verifies the one
configured Super Admin. On later starts, the bootstrap synchronizes its name,
active/verified state, and password hash without creating a duplicate.

## Deliberate one-time reset

The reset command is isolated behind the `tools` Compose profile, rejects
non-MySQL/system databases, requires the exact configured database name, and
refuses to run when `APP_ENV` is `prod` or `production`.

From the repository root, run:

```powershell
docker compose up -d db
docker compose --profile tools run --rm reset
docker compose --profile tools run --rm verify-clean-db
docker compose up --build -d
```

`reset` keeps the MySQL container, `db_data` volume, and database itself. It
disables foreign-key checks only for its own MySQL session, drops every view
and table in the explicitly confirmed application schema, restores foreign-key
checks, runs all Alembic migrations, and bootstraps only the Super Admin.

`verify-clean-db` checks that all 59 current model tables exist, Alembic is at
head, exactly one active and verified Super Admin exists, its hash matches the
configured password, and every non-user application table contains zero rows.

Never expose the reset command through an API or frontend route. Never include
the private `.env` in version control.
