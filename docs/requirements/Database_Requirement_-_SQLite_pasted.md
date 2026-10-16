# Database Requirement — SQLite

The application MUST use **SQLite** as its database.

I do not have SQL Server, PostgreSQL, MySQL, or any other database server installed on my Debian server.

Therefore:

- Do NOT require a separate database server.
- Do NOT create a PostgreSQL container.
- Do NOT create a SQL Server container.
- Do NOT require any external database installation.
- SQLite should run directly inside the application container.
- The SQLite database file must be stored on a Docker persistent volume/bind mount so that restarting, recreating, or updating the application container does NOT delete the data.

Use:

```text
SQLite
    ↓
Entity Framework Core
    ↓
ASP.NET Core
```

A suitable database configuration would be conceptually:

```text
/data/interviewforge.db
```

The exact path can be configurable through an environment variable.

For example:

```env
ConnectionStrings__DefaultConnection=Data Source=/data/interviewforge.db
```

Docker should persist the `/data` directory.

For example, the deployment should support something equivalent to:

```yaml
volumes:
  - ./data:/data
```

This means the database survives:

```bash
docker compose down
docker compose up -d
```

and application image/container updates.

---

## SQLite EF Core Configuration

Use the official EF Core SQLite provider:

```text
Microsoft.EntityFrameworkCore.Sqlite
```

Configure the application's `DbContext` using the SQLite connection string.

Use EF Core migrations for schema management.

The application should be capable of creating/updating the SQLite database automatically on first startup or through an explicit migration command.

For this single-user self-hosted application, automatic migration on startup is acceptable if implemented safely.

---

## SQLite Considerations

Design the application with SQLite's characteristics in mind.

Avoid unnecessarily database-intensive operations.

Use:

- Proper indexes
- Pagination
- Efficient EF Core queries
- `AsNoTracking()` for read-only queries
- Server-side filtering
- Server-side search
- Proper transactions where required

Do not assume that features specific to SQL Server or PostgreSQL are available.

The application should remain fully functional using SQLite.

---

## SQLite Backup

The README MUST explain how to back up the database.

For example, because the database is stored in:

```text
./data/interviewforge.db
```

a backup can simply be made by copying the database file while the application is stopped, or using SQLite's appropriate backup mechanism.

Document a simple backup procedure for the Debian server.

---

## Docker Architecture

Since SQLite does not require a database server, prefer a simple architecture:

```text
Debian Server
      │
      ▼
   Docker
      │
      ▼
┌─────────────────────────┐
│   InterviewForge        │
│                         │
│ ASP.NET Core API        │
│ Angular Frontend        │
│ EF Core                 │
│ SQLite                  │
│                         │
│ /data/interviewforge.db │
└────────────┬────────────┘
             │
             ▼
       Persistent Volume
```

If the frontend and backend are separated into multiple containers, SQLite MUST remain owned by the backend/API container and persisted through a shared host volume.

For a personal single-user application, prefer the **simplest reliable deployment architecture** rather than introducing unnecessary containers.

The final deployment MUST work with:

```bash
docker compose up -d
```

without requiring me to install a database on Debian.

The application must be accessible at:

```text
http://<server-ip>:8888
```

---

## Important

SQLite is not merely a development fallback.

**SQLite is the intended production database for this personal self-hosted application.**

Design and test the application's persistence layer specifically around SQLite.