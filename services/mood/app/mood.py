"""Turn Lagos's time of day and weather into scene parameters.

Pure functions only (no I/O), so every rule here is unit-tested. The site
blends these values in gently; none of them can break the scene.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

# WMO weather interpretation codes, as used by Open-Meteo.
WMO = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "fog",
    51: "light drizzle",
    53: "drizzle",
    55: "heavy drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    80: "light showers",
    81: "showers",
    82: "heavy showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "thunderstorm with hail",
}
RAIN_CODES = {51, 53, 55, 61, 63, 65, 80, 81, 82}
STORM_CODES = {95, 96, 99}

# How long either side of sunrise/sunset counts as dawn/dusk.
TWILIGHT = timedelta(minutes=50)


@dataclass(frozen=True)
class Weather:
    temperature_c: float
    wind_kmh: float
    precipitation_mm: float
    cloud_cover: float  # 0–100 %
    code: int


@dataclass(frozen=True)
class Params:
    """What the scene reads. All values are bounded (see `clamp`)."""

    #: Multiplies the curl-noise turbulence (1 = the site's default).
    turbulence: float
    #: 0 = the site's own pinks; 1 = fully the phase tint below.
    tint_mix: float
    #: Phase tint, sRGB hex.
    tint: str
    #: Extra particle energy (0–1): storms flicker, calm nights settle.
    energy: float
    #: Multiplies particle speed-of-settling (1 = default); rain slows things down.
    calm: float


# Bold enough to notice: each phase has its own colour, day keeps the site's pink.
TINTS = {
    "dawn": "#fb923c",  # orange-400, peach sunrise
    "day": "#ec4899",  # the site's own pink-500
    "dusk": "#f97316",  # orange-500, sunset coral
    "night": "#7c3aed",  # violet-600, deep night
}
TINT_MIX = {"dawn": 0.6, "day": 0.0, "dusk": 0.65, "night": 0.7}


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def phase(now: datetime, sunrise: datetime, sunset: datetime) -> str:
    """dawn / day / dusk / night for `now`, from the day's sunrise and sunset."""
    if abs(now - sunrise) <= TWILIGHT:
        return "dawn"
    if abs(now - sunset) <= TWILIGHT:
        return "dusk"
    if sunrise < now < sunset:
        return "day"
    return "night"


def describe(code: int) -> str:
    return WMO.get(code, "unsettled")


def params(phase_name: str, weather: Weather | None) -> Params:
    """Scene parameters for a phase and (optional) current weather."""
    turbulence = 1.0
    energy = 0.0
    calm = 1.0
    if phase_name == "night":
        turbulence, calm = 0.85, 0.9

    if weather is not None:
        # Wind stirs the field: 0 km/h adds nothing, 40 km/h roughly +60 %.
        turbulence *= 1.0 + clamp(weather.wind_kmh / 40.0, 0.0, 1.0) * 0.6
        if weather.code in RAIN_CODES or weather.precipitation_mm > 0.2:
            # Rain calms the particles and softens the swirl.
            calm *= 0.75
            turbulence *= 0.8
        if weather.code in STORM_CODES:
            turbulence *= 1.35
            energy = 0.35

    return Params(
        turbulence=round(clamp(turbulence, 0.5, 1.8), 3),
        tint_mix=TINT_MIX[phase_name],
        tint=TINTS[phase_name],
        energy=round(clamp(energy, 0.0, 1.0), 3),
        calm=round(clamp(calm, 0.5, 1.2), 3),
    )


def as_dict(p: Params) -> dict:
    return asdict(p)
