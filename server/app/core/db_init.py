from sqlalchemy import inspect, text
from app.core.database import engine, Base
from app.infrastructure.db import models as _models  # noqa: F401  (registers tables on Base)


def migrate_missing_columns():
    """Adds to existing tables any column declared in the models but missing in the database."""
    inspector = inspect(engine)
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue
            if column.primary_key:
                print(f"Cannot add primary key column {table.name}.{column.name} automatically; skipping.")
                continue
            ddl = f"ALTER TABLE {table.name} ADD COLUMN {column.name} {column.type.compile(engine.dialect)}"
            default = column.default.arg if column.default is not None and column.default.is_scalar else None
            if isinstance(default, (int, float)) and not isinstance(default, bool):
                ddl += f" DEFAULT {default}"
            elif isinstance(default, str):
                ddl += " DEFAULT '" + default.replace("'", "''") + "'"
            print(f"Schema migration: adding missing column {table.name}.{column.name}")
            with engine.begin() as conn:
                conn.execute(text(ddl))


def init_db():
    """Creates missing tables, then adds missing columns.

    The database is NEVER deleted: it holds the backup logs, and losing them used to make the
    backup cleanup treat every existing backup folder as an orphan.
    """
    Base.metadata.create_all(bind=engine)
    try:
        migrate_missing_columns()
    except Exception as e:
        print(f"Error during schema migration: {e}")
