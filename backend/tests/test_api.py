from fastapi.testclient import TestClient

from app.main import app


def test_health_is_available() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_dashboard_has_expected_metrics() -> None:
    with TestClient(app) as client:
        response = client.get("/api/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["total_orders"] > 0
    assert 0 <= payload["data"]["delivery_success_rate"] <= 100
    assert payload["meta"]["source"] == "mock"


def test_delivery_filter_and_pagination() -> None:
    with TestClient(app) as client:
        response = client.get("/api/deliveries?state=SP&limit=2")
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["count"] <= 2
    assert payload["meta"]["total"] > 0
    assert all(row["customer_state"] == "SP" for row in payload["data"])


def test_state_and_review_summaries_have_all_states() -> None:
    with TestClient(app) as client:
        states = client.get("/api/states").json()["data"]
        reviews = client.get("/api/reviews").json()["data"]
    assert len(states) == 27
    assert len(reviews) == 27


def test_cities_include_order_counts() -> None:
    with TestClient(app) as client:
        response = client.get("/api/cities")
    assert response.status_code == 200
    cities = response.json()["data"]
    assert cities
    assert cities[0]["orders"] >= cities[-1]["orders"]
    assert cities[0]["customer_city"]


def test_delivery_pagination_returns_next_records() -> None:
    with TestClient(app) as client:
        first = client.get("/api/deliveries?limit=1&offset=0").json()["data"][0]
        second = client.get("/api/deliveries?limit=1&offset=1").json()["data"][0]
    assert first["order_id"] != second["order_id"]


def test_delivery_search_filters_case_insensitive_city() -> None:
    with TestClient(app) as client:
        response = client.get("/api/deliveries?state=sp&city=SAO%20PAULO&limit=3")
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["total"] > 0
    assert len(payload["data"]) <= 3
    assert all(
        row["customer_state"].casefold() == "sp"
        and "sao paulo" in row["customer_city"].casefold()
        for row in payload["data"]
    )


def test_dashboard_deduplicates_mock_warnings() -> None:
    with TestClient(app) as client:
        payload = client.get("/api/dashboard").json()
    assert payload["meta"]["warning"] == "MongoDB is not configured; showing sample data."
