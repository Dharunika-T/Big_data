import random
from datetime import UTC, datetime
from typing import Any

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.config import APP_DATA_MODE, MONGODB_DATABASE, MONGODB_URI

STATES = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
    "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
    "SE", "SP", "TO",
]
DELIVERY_COLLECTION = "delivery_analysis"
REVIEW_COLLECTION = "review_summary"
STATE_COLLECTION = "state_summary"


def _mock_data() -> dict[str, list[dict[str, Any]]]:
    rng = random.Random(20261013)
    cities = [
        "sao paulo", "rio de janeiro", "belo horizonte", "curitiba", "campinas",
        "porto alegre", "salvador", "brasilia", "recife", "fortaleza",
    ]
    deliveries = []
    for index in range(320):
        state = STATES[index % len(STATES)]
        delay = round(rng.uniform(-18, 5), 2)
        rating = round(rng.uniform(2.8, 5), 1)
        item_total = round(rng.uniform(20, 850), 2)
        freight = round(rng.uniform(5, 90), 2)
        deliveries.append(
            {
                "order_id": f"mock-{index + 1:05d}",
                "customer_city": cities[index % len(cities)],
                "customer_state": state,
                "item_total": item_total,
                "freight_total": freight,
                "payment_total": round(item_total + freight, 2),
                "avg_review_score": rating,
                "delay_days": delay,
                "delivery_result": "Delayed" if delay > 0 else "OnTimeOrEarly",
            }
        )

    reviews = []
    state_summaries = []
    for state in STATES:
        rows = [row for row in deliveries if row["customer_state"] == state]
        reviews.append(
            {
                "customer_state": state,
                "reviewed_orders": len(rows),
                "avg_review_score": round(sum(row["avg_review_score"] for row in rows) / len(rows), 2),
            }
        )
        state_summaries.append(
            {
                "customer_state": state,
                "delivered_orders": len(rows),
                "total_delay_days": round(sum(row["delay_days"] for row in rows), 2),
                "avg_delay_days": round(sum(row["delay_days"] for row in rows) / len(rows), 2),
            }
        )
    return {
        DELIVERY_COLLECTION: deliveries,
        REVIEW_COLLECTION: reviews,
        STATE_COLLECTION: state_summaries,
    }


MOCK_DATA = _mock_data()


class DataProvider:
    def __init__(self) -> None:
        self._client: MongoClient | None = None

    def close(self) -> None:
        if self._client is not None:
            self._client.close()

    def read(self, collection: str) -> tuple[list[dict[str, Any]], str, str | None]:
        mode = APP_DATA_MODE
        if mode not in {"auto", "mock", "mongodb"}:
            raise ValueError("APP_DATA_MODE must be one of: auto, mock, mongodb")
        if mode == "mock":
            return MOCK_DATA[collection], "mock", None
        if not MONGODB_URI:
            if mode == "mongodb":
                raise RuntimeError("MONGODB_URI is required when APP_DATA_MODE=mongodb")
            return MOCK_DATA[collection], "mock", "MongoDB is not configured; showing sample data."

        try:
            if self._client is None:
                self._client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
            database = self._client[MONGODB_DATABASE]
            self._client.admin.command("ping")
            records = list(database[collection].find({}, {"_id": False}))
            if records:
                return records, "mongodb", None
            if mode == "mongodb":
                return [], "mongodb", f"MongoDB collection '{collection}' is empty."
            return MOCK_DATA[collection], "mock", f"MongoDB collection '{collection}' is empty; showing sample data."
        except PyMongoError as error:
            if mode == "mongodb":
                raise RuntimeError(f"MongoDB is unavailable: {error}") from error
            return MOCK_DATA[collection], "mock", f"MongoDB is unavailable; showing sample data ({error})."

    def dashboard_summary(self) -> tuple[dict[str, Any], str, str | None]:
        mock_rows = MOCK_DATA[DELIVERY_COLLECTION]
        if APP_DATA_MODE == "mock":
            return _summarize(mock_rows), "mock", None
        if not MONGODB_URI:
            if APP_DATA_MODE == "mongodb":
                raise RuntimeError("MONGODB_URI is required when APP_DATA_MODE=mongodb")
            return _summarize(mock_rows), "mock", "MongoDB is not configured; showing sample data."
        try:
            if self._client is None:
                self._client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
            database = self._client[MONGODB_DATABASE]
            self._client.admin.command("ping")
            rows = list(database[DELIVERY_COLLECTION].aggregate([
                {
                    "$group": {
                        "_id": None,
                        "total_orders": {"$sum": 1},
                        "total_revenue": {"$sum": {"$ifNull": ["$payment_total", 0]}},
                        "item_total": {"$sum": {"$ifNull": ["$item_total", 0]}},
                        "freight_total": {"$sum": {"$ifNull": ["$freight_total", 0]}},
                        "avg_review_score": {"$avg": "$avg_review_score"},
                        "avg_delay_days": {"$avg": "$delay_days"},
                        "delayed_orders": {
                            "$sum": {"$cond": [{"$gt": ["$delay_days", 0]}, 1, 0]}
                        },
                    }
                }
            ]))
            top_states = list(database[DELIVERY_COLLECTION].aggregate([
                {
                    "$group": {
                        "_id": "$customer_state",
                        "revenue": {"$sum": {"$ifNull": ["$payment_total", 0]}},
                    }
                },
                {"$sort": {"revenue": -1}},
                {"$limit": 10},
                {"$project": {"_id": 0, "customer_state": "$_id", "revenue": 1}},
            ]))
            if not rows or not rows[0].get("total_orders"):
                if APP_DATA_MODE == "mongodb":
                    return _summarize([]), "mongodb", "MongoDB delivery_analysis collection is empty."
                return _summarize(mock_rows), "mock", "MongoDB delivery_analysis collection is empty; showing sample data."
            summary = rows[0]
            count = int(summary["total_orders"])
            return {
                "total_orders": count,
                "total_revenue": round(float(summary.get("total_revenue") or 0), 2),
                "item_total": round(float(summary.get("item_total") or 0), 2),
                "freight_total": round(float(summary.get("freight_total") or 0), 2),
                "avg_review_score": round(float(summary.get("avg_review_score") or 0), 2),
                "avg_delay_days": round(float(summary.get("avg_delay_days") or 0), 2),
                "delayed_orders": int(summary.get("delayed_orders") or 0),
                "delivery_success_rate": round(
                    (count - int(summary.get("delayed_orders") or 0)) / count * 100, 1
                ),
                "top_revenue_states": top_states,
            }, "mongodb", None
        except PyMongoError as error:
            if APP_DATA_MODE == "mongodb":
                raise RuntimeError(f"MongoDB is unavailable: {error}") from error
            return _summarize(mock_rows), "mock", f"MongoDB is unavailable; showing sample data ({error})."

    def city_counts(self) -> tuple[list[dict[str, Any]], str, str | None]:
        if APP_DATA_MODE == "mock":
            return _city_counts(MOCK_DATA[DELIVERY_COLLECTION]), "mock", None
        if not MONGODB_URI:
            if APP_DATA_MODE == "mongodb":
                raise RuntimeError("MONGODB_URI is required when APP_DATA_MODE=mongodb")
            return _city_counts(MOCK_DATA[DELIVERY_COLLECTION]), "mock", "MongoDB is not configured; showing sample data."
        try:
            if self._client is None:
                self._client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
            self._client.admin.command("ping")
            cities = list(self._client[MONGODB_DATABASE][DELIVERY_COLLECTION].aggregate([
                {"$group": {"_id": "$customer_city", "orders": {"$sum": 1}}},
                {"$sort": {"orders": -1, "_id": 1}},
                {"$project": {"_id": 0, "customer_city": "$_id", "orders": 1}},
            ]))
            if cities:
                return cities, "mongodb", None
            if APP_DATA_MODE == "mongodb":
                return [], "mongodb", "MongoDB delivery_analysis collection is empty."
            return _city_counts(MOCK_DATA[DELIVERY_COLLECTION]), "mock", "MongoDB delivery_analysis collection is empty; showing sample data."
        except PyMongoError as error:
            if APP_DATA_MODE == "mongodb":
                raise RuntimeError(f"MongoDB is unavailable: {error}") from error
            return _city_counts(MOCK_DATA[DELIVERY_COLLECTION]), "mock", f"MongoDB is unavailable; showing sample data ({error})."

    def search_deliveries(
        self,
        state: str | None,
        city: str | None,
        result: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int, str, str | None]:
        mode = APP_DATA_MODE
        if mode not in {"auto", "mock", "mongodb"}:
            raise ValueError("APP_DATA_MODE must be one of: auto, mock, mongodb")
        if mode == "mock":
            records = _filter_deliveries(MOCK_DATA[DELIVERY_COLLECTION], state, city, result)
            return records[offset : offset + limit], len(records), "mock", None
        if not MONGODB_URI:
            if mode == "mongodb":
                raise RuntimeError("MONGODB_URI is required when APP_DATA_MODE=mongodb")
            records = _filter_deliveries(MOCK_DATA[DELIVERY_COLLECTION], state, city, result)
            return (
                records[offset : offset + limit],
                len(records),
                "mock",
                "MongoDB is not configured; showing sample data.",
            )
        mongo_filter: dict[str, Any] = {}
        if state:
            mongo_filter["customer_state"] = {"$regex": f"^{_escape_regex(state)}$", "$options": "i"}
        if city:
            mongo_filter["customer_city"] = {"$regex": _escape_regex(city), "$options": "i"}
        if result:
            mongo_filter["delivery_result"] = {"$regex": f"^{_escape_regex(result)}$", "$options": "i"}
        try:
            if self._client is None:
                self._client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
            self._client.admin.command("ping")
            collection = self._client[MONGODB_DATABASE][DELIVERY_COLLECTION]
            total = collection.count_documents(mongo_filter)
            records = list(
                collection.find(mongo_filter, {"_id": False})
                .sort("order_id", 1)
                .skip(offset)
                .limit(limit)
            )
            if records or total > 0 or mode == "mongodb":
                warning = (
                    f"MongoDB collection '{DELIVERY_COLLECTION}' is empty."
                    if total == 0
                    else None
                )
                return records, total, "mongodb", warning
            fallback = _filter_deliveries(MOCK_DATA[DELIVERY_COLLECTION], state, city, result)
            return fallback[offset : offset + limit], len(fallback), "mock", f"MongoDB collection '{DELIVERY_COLLECTION}' is empty; showing sample data."
        except PyMongoError as error:
            if mode == "mongodb":
                raise RuntimeError(f"MongoDB is unavailable: {error}") from error
            fallback = _filter_deliveries(MOCK_DATA[DELIVERY_COLLECTION], state, city, result)
            return (
                fallback[offset : offset + limit],
                len(fallback),
                "mock",
                f"MongoDB is unavailable; showing sample data ({error}).",
            )

    def status(self) -> dict[str, Any]:
        if APP_DATA_MODE == "mock":
            return {"mode": "mock", "mongodb_connected": False}
        if not MONGODB_URI:
            if APP_DATA_MODE == "mongodb":
                return {
                    "mode": "mongodb",
                    "mongodb_connected": False,
                    "warning": "MONGODB_URI is required when APP_DATA_MODE=mongodb",
                }
            return {"mode": "mock", "mongodb_connected": False}
        try:
            if self._client is None:
                self._client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
            self._client.admin.command("ping")
            return {"mode": "mongodb", "mongodb_connected": True}
        except PyMongoError as error:
            return {"mode": "mock", "mongodb_connected": False, "warning": str(error)}


def _summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    count = len(rows)
    delayed = sum(1 for row in rows if float(row.get("delay_days") or 0) > 0)
    total_revenue = sum(float(row.get("payment_total") or 0) for row in rows)
    state_totals: dict[str, float] = {}
    for row in rows:
        state = str(row.get("customer_state") or "Unknown")
        state_totals[state] = state_totals.get(state, 0) + float(row.get("payment_total") or 0)
    return {
        "total_orders": count,
        "total_revenue": round(total_revenue, 2),
        "item_total": round(sum(float(row.get("item_total") or 0) for row in rows), 2),
        "freight_total": round(sum(float(row.get("freight_total") or 0) for row in rows), 2),
        "avg_review_score": round(
            sum(float(row.get("avg_review_score") or 0) for row in rows) / count, 2
        ) if count else 0,
        "avg_delay_days": round(
            sum(float(row.get("delay_days") or 0) for row in rows) / count, 2
        ) if count else 0,
        "delayed_orders": delayed,
        "delivery_success_rate": round((count - delayed) / count * 100, 1) if count else 0,
        "top_revenue_states": [
            {"customer_state": state, "revenue": round(revenue, 2)}
            for state, revenue in sorted(state_totals.items(), key=lambda item: item[1], reverse=True)[:10]
        ],
    }


def _city_counts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for row in rows:
        city = str(row.get("customer_city") or "")
        if city:
            counts[city] = counts.get(city, 0) + 1
    return [
        {"customer_city": city, "orders": orders}
        for city, orders in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]


def _filter_deliveries(
    rows: list[dict[str, Any]],
    state: str | None,
    city: str | None,
    result: str | None,
) -> list[dict[str, Any]]:
    return [
        row
        for row in rows
        if (not state or str(row.get("customer_state", "")).casefold() == state.casefold())
        and (not city or city.casefold() in str(row.get("customer_city", "")).casefold())
        and (not result or str(row.get("delivery_result", "")).casefold() == result.casefold())
    ]


def _escape_regex(value: str) -> str:
    import re

    return re.escape(value)


def make_metadata(records: list[dict[str, Any]], source: str, warning: str | None) -> dict[str, Any]:
    return {
        "source": source,
        "count": len(records),
        "warning": warning,
        "generated_at": datetime.now(UTC).isoformat(),
    }
