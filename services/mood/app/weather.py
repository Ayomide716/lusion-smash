"""Current Lagos weather from Open-Meteo (free, no API key), cached.

The cache keeps the free API from being hit on every page view: one upstream
request per `ttl` at most, and a stale copy is served if Open-Meteo is down.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from .mood import Weather

log = logging.getLogger("mood.weather")

LAGOS = {"latitude": 6.5244, "longitude": 3.3792}
TZ = ZoneInfo("Africa/Lagos")
URL = "https://api.open-meteo.com/v1/forecast"
QUERY = {
    **LAGOS,
    "current": "temperature_2m,precipitation,weather_code,wind_speed_10m,cloud_cover",
    "daily": "sunrise,sunset",
    "timezone": "Africa/Lagos",
    "forecast_days": 1,
}


@dataclass(frozen=True)
class Snapshot:
    weather: Weather
    sunrise: datetime
    sunset: datetime
    fetched_at: float  # time.time()


def parse(payload: dict) -> Snapshot:
    """Parse an Open-Meteo forecast response. Raises on missing fields."""
    cur = payload["current"]
    daily = payload["daily"]
    weather = Weather(
        temperature_c=float(cur["temperature_2m"]),
        wind_kmh=float(cur["wind_speed_10m"]),
        precipitation_mm=float(cur["precipitation"]),
        cloud_cover=float(cur["cloud_cover"]),
        code=int(cur["weather_code"]),
    )
    # Open-Meteo returns local times without an offset when `timezone` is set.
    sunrise = datetime.fromisoformat(daily["sunrise"][0]).replace(tzinfo=TZ)
    sunset = datetime.fromisoformat(daily["sunset"][0]).replace(tzinfo=TZ)
    return Snapshot(weather, sunrise, sunset, time.time())


class WeatherCache:
    def __init__(self, client: httpx.AsyncClient, ttl: float = 600.0, timeout: float = 10.0):
        self.client = client
        self.ttl = ttl
        self.timeout = timeout
        self.snapshot: Snapshot | None = None
        #: Why the last upstream request failed (shown by /mood while there's no weather).
        self.last_error: str | None = None
        self._lock = asyncio.Lock()

    async def get(self) -> Snapshot | None:
        """Fresh-enough weather, a stale copy if the upstream fails, or None."""
        if self.snapshot and time.time() - self.snapshot.fetched_at < self.ttl:
            return self.snapshot
        async with self._lock:
            # Another request may have refreshed it while we waited.
            if self.snapshot and time.time() - self.snapshot.fetched_at < self.ttl:
                return self.snapshot
            try:
                res = await self.client.get(URL, params=QUERY, timeout=self.timeout)
                res.raise_for_status()
                self.snapshot = parse(res.json())
                self.last_error = None
            except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as err:
                self.last_error = f"{type(err).__name__}: {err}"[:200]
                log.warning("Open-Meteo unavailable, serving %s: %s", "stale weather" if self.snapshot else "time only", err)
            return self.snapshot
