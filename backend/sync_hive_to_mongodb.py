import os
import sys
import uuid
from collections.abc import Iterator
from typing import Any

from dotenv import load_dotenv
from pyhive import hive
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

TABLES = ("delivery_analysis", "review_summary", "state_summary")
HIVE_QUERIES = {
    "delivery_analysis": (
        "SELECT order_id, customer_city, customer_state, item_total, freight_total, "
        "payment_total, avg_review_score, delay_days, delivery_result FROM delivery_analysis"
    ),
    "review_summary": (
        "SELECT customer_state, reviewed_orders, avg_review_score FROM review_summary"
    ),
    "state_summary": (
        "SELECT customer_state, delivered_orders, total_delay_days, avg_delay_days FROM state_summary"
    ),
}


def rows_as_documents(cursor: Any) -> Iterator[dict[str, Any]]:
    names = [column[0] for column in cursor.description]
    while rows := cursor.fetchmany(1000):
        for row in rows:
            yield dict(zip(names, row, strict=True))


def sync_table(cursor: Any, database: Any, table: str) -> int:
    staging_name = f"{table}__staging_{uuid.uuid4().hex}"
    staging = database[staging_name]
    try:
        cursor.execute(HIVE_QUERIES[table])
        batch: list[dict[str, Any]] = []
        total = 0
        for document in rows_as_documents(cursor):
            batch.append(document)
            if len(batch) == 1000:
                staging.insert_many(batch, ordered=False)
                total += len(batch)
                batch.clear()
        if batch:
            staging.insert_many(batch, ordered=False)
            total += len(batch)
        staging.rename(table, dropTarget=True)
        print(f"{table}: synchronized {total:,} records")
        return total
    except Exception:
        database.drop_collection(staging_name)
        raise


def main() -> int:
    required = ("MONGODB_URI",)
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        print(f"Missing required settings in backend/.env: {', '.join(missing)}", file=sys.stderr)
        return 2

    hive_connection = None
    mongo_client = None
    try:
        hive_connection = hive.Connection(
            host=os.getenv("HIVE_HOST", "localhost"),
            port=int(os.getenv("HIVE_PORT", "10000")),
            username=os.getenv("HIVE_USERNAME") or "hive",
            password=os.getenv("HIVE_PASSWORD") or None,
            database=os.getenv("HIVE_DATABASE", "default"),
            auth=os.getenv("HIVE_AUTH", "NONE"),
        )
        mongo_client = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=5000)
        mongo_client.admin.command("ping")
        database = mongo_client[os.getenv("MONGODB_DATABASE", "ecommerce_bi")]
        cursor = hive_connection.cursor()
        try:
            for table in TABLES:
                sync_table(cursor, database, table)
        finally:
            cursor.close()
        print("Hive-to-MongoDB sync completed.")
        return 0
    except Exception as error:
        print(f"Sync failed: {error}", file=sys.stderr)
        return 1
    finally:
        if hive_connection is not None:
            hive_connection.close()
        if mongo_client is not None:
            mongo_client.close()


if __name__ == "__main__":
    raise SystemExit(main())
