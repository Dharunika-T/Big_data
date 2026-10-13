from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import API_CORS_ORIGINS, APP_DATA_MODE
from app.data import (
    DELIVERY_COLLECTION,
    REVIEW_COLLECTION,
    STATE_COLLECTION,
    DataProvider,
    make_metadata,
)


provider = DataProvider()


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    provider.close()


app = FastAPI(title="E-Commerce BI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=API_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def fetch(collection: str) -> tuple[list[dict[str, Any]], str, str | None]:
    try:
        return provider.read(collection)
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def response(records: list[dict[str, Any]], source: str, warning: str | None) -> dict[str, Any]:
    return {"data": records, "meta": make_metadata(records, source, warning)}


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "configured_mode": APP_DATA_MODE, **provider.status()}


@app.get("/api/dashboard")
def dashboard() -> dict[str, Any]:
    try:
        summary, delivery_source, delivery_warning = provider.dashboard_summary()
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    review_rows, review_source, review_warning = fetch(REVIEW_COLLECTION)
    states, state_source, state_warning = fetch(STATE_COLLECTION)
    source = "mongodb" if {delivery_source, review_source, state_source} == {"mongodb"} else "mock"
    warnings = list(
        dict.fromkeys(
            warning for warning in (delivery_warning, review_warning, state_warning) if warning
        )
    )
    return {
        "data": {
            **summary,
            "states": sorted(states, key=lambda row: row.get("customer_state", "")),
            "review_summary": review_rows,
        },
        "meta": {"source": source, "warning": "; ".join(warnings) or None},
    }


@app.get("/api/states")
def states() -> dict[str, Any]:
    records, source, warning = fetch(STATE_COLLECTION)
    return response(sorted(records, key=lambda row: float(row.get("avg_delay_days") or 0), reverse=True), source, warning)


@app.get("/api/reviews")
def reviews() -> dict[str, Any]:
    records, source, warning = fetch(REVIEW_COLLECTION)
    return response(sorted(records, key=lambda row: float(row.get("avg_review_score") or 0), reverse=True), source, warning)


@app.get("/api/deliveries")
def deliveries(
    state: str | None = None,
    city: str | None = None,
    result: str | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
) -> dict[str, Any]:
    try:
        records, total, source, warning = provider.search_deliveries(
            state, city, result, offset, limit
        )
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    result_data = response(records, source, warning)
    result_data["meta"].update({"total": total, "offset": offset, "limit": limit})
    return result_data


@app.get("/api/cities")
def cities() -> dict[str, Any]:
    try:
        records, source, warning = provider.city_counts()
    except (RuntimeError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return response(records, source, warning)
