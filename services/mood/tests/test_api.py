import json
from datetime import datetime

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main
from app.weather import TZ, WeatherCache, parse

PAYLOAD = {
    "current": {"temperature_2m": 29.4, "precipitation": 0.0, "weather_code": 2, "wind_speed_10m": 14.8, "cloud_cover": 40},
    "daily": {"sunrise": ["2026-09-27T06:48"], "sunset": ["2026-09-27T18:54"]},
}


def upstream(handler):
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.fixture
def client(monkeypatch):
    calls = {"n": 0, "fail": False}

    def handler(request: httpx.Request):
        calls["n"] += 1
        assert request.url.host == "api.open-meteo.com"
        assert request.url.params["timezone"] == "Africa/Lagos"
        if calls["fail"]:
            return httpx.Response(503)
        return httpx.Response(200, json=PAYLOAD)

    monkeypatch.setattr(main, "now_lagos", lambda: datetime(2026, 9, 27, 19, 10, tzinfo=TZ))
    with TestClient(main.app) as c:
        main.app.state.weather = WeatherCache(upstream(handler))
        yield c, calls


def test_parse_reads_open_meteo():
    snap = parse(PAYLOAD)
    assert snap.weather.code == 2 and snap.weather.wind_kmh == 14.8
    assert snap.sunset.hour == 18 and snap.sunset.tzinfo is TZ


def test_mood_endpoint(client):
    c, _ = client
    res = c.get("/mood")
    assert res.status_code == 200
    body = res.json()
    assert body["phase"] == "dusk"  # 19:10 is within 50 minutes of an 18:54 sunset
    assert body["weather"] == {"temperature_c": 29, "wind_kmh": 15, "description": "partly cloudy", "code": 2}
    assert set(body["params"]) == {"turbulence", "tint_mix", "tint", "energy", "calm"}
    assert "max-age" in res.headers["cache-control"]


def test_weather_is_cached(client):
    c, calls = client
    for _ in range(5):
        c.get("/mood")
    assert calls["n"] == 1


def test_stale_weather_is_served_when_upstream_fails(client):
    c, calls = client
    c.get("/mood")
    main.app.state.weather.ttl = 0  # force a refresh on the next request
    calls["fail"] = True
    body = c.get("/mood").json()
    assert calls["n"] == 2
    assert body["weather"]["description"] == "partly cloudy"


def test_no_weather_at_all_still_answers(monkeypatch):
    def handler(request):
        return httpx.Response(200, content=b"not json")

    monkeypatch.setattr(main, "now_lagos", lambda: datetime(2026, 9, 27, 13, 0, tzinfo=TZ))
    with TestClient(main.app) as c:
        main.app.state.weather = WeatherCache(upstream(handler))
        body = c.get("/mood").json()
    assert body["weather"] is None and body["phase"] == "day"
    assert json.dumps(body)  # serialisable


def test_cors_allows_any_site_to_read(client):
    c, _ = client
    res = c.get("/mood", headers={"Origin": "https://example.com"})
    assert res.headers["access-control-allow-origin"] == "*"


def test_health(client):
    c, _ = client
    assert c.get("/healthz").json() == {"ok": True}
