"""Mood service: GET /mood returns Lagos's phase of day, weather and the
scene parameters derived from them. The portfolio fetches it on load and
blends the values in; if this service is asleep or down, the site simply
keeps its default look.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, time as dtime

import httpx
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from . import mood
from .weather import TZ, WeatherCache

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(headers={"User-Agent": "ayomide-portfolio-mood/1.0"}) as client:
        app.state.weather = WeatherCache(client)
        yield


app = FastAPI(title="Portfolio mood", docs_url=None, redoc_url=None, lifespan=lifespan)
# Public, read-only, no cookies: any page may read it.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=[])

# Used when the weather (and so the real sun times) is unavailable.
FALLBACK_SUNRISE = dtime(6, 50)
FALLBACK_SUNSET = dtime(18, 55)


def now_lagos() -> datetime:
    return datetime.now(TZ)


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@app.get("/mood")
async def get_mood(response: Response) -> dict:
    now = now_lagos()
    snap = await app.state.weather.get()
    if snap:
        sunrise, sunset, weather = snap.sunrise, snap.sunset, snap.weather
    else:
        sunrise = now.replace(hour=FALLBACK_SUNRISE.hour, minute=FALLBACK_SUNRISE.minute, second=0, microsecond=0)
        sunset = now.replace(hour=FALLBACK_SUNSET.hour, minute=FALLBACK_SUNSET.minute, second=0, microsecond=0)
        weather = None

    phase = mood.phase(now, sunrise, sunset)
    # Browsers and CDNs may reuse it briefly; the weather only changes every few minutes.
    response.headers["Cache-Control"] = "public, max-age=300"
    return {
        "city": "Lagos",
        "local_time": now.strftime("%H:%M"),
        "phase": phase,
        "weather": None
        if weather is None
        else {
            "temperature_c": round(weather.temperature_c),
            "wind_kmh": round(weather.wind_kmh),
            "description": mood.describe(weather.code),
            "code": weather.code,
        },
        "params": mood.as_dict(mood.params(phase, weather)),
    }
