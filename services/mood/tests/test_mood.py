from datetime import datetime, timedelta

from app import mood
from app.weather import TZ

SUNRISE = datetime(2026, 9, 27, 6, 48, tzinfo=TZ)
SUNSET = datetime(2026, 9, 27, 18, 54, tzinfo=TZ)


def at(h, m=0):
    return datetime(2026, 9, 27, h, m, tzinfo=TZ)


def calm_weather(**kw):
    base = dict(temperature_c=28, wind_kmh=0, precipitation_mm=0, cloud_cover=20, code=1)
    return mood.Weather(**{**base, **kw})


def test_phase_follows_the_sun():
    assert mood.phase(at(3), SUNRISE, SUNSET) == "night"
    assert mood.phase(SUNRISE - timedelta(minutes=30), SUNRISE, SUNSET) == "dawn"
    assert mood.phase(SUNRISE + timedelta(minutes=30), SUNRISE, SUNSET) == "dawn"
    assert mood.phase(at(12), SUNRISE, SUNSET) == "day"
    assert mood.phase(SUNSET, SUNRISE, SUNSET) == "dusk"
    assert mood.phase(at(22), SUNRISE, SUNSET) == "night"


def test_clear_day_is_the_sites_default_look():
    p = mood.params("day", calm_weather())
    assert p.turbulence == 1.0 and p.tint_mix == 0.0 and p.energy == 0.0 and p.calm == 1.0


def test_wind_raises_turbulence_and_rain_calms():
    still = mood.params("day", calm_weather()).turbulence
    windy = mood.params("day", calm_weather(wind_kmh=30)).turbulence
    rainy = mood.params("day", calm_weather(code=63, precipitation_mm=2))
    assert windy > still
    assert rainy.turbulence < still and rainy.calm < 1


def test_storms_add_energy():
    assert mood.params("day", calm_weather(code=95)).energy > 0


def test_everything_stays_in_bounds_for_extreme_weather():
    for w in (calm_weather(wind_kmh=500, code=95), calm_weather(wind_kmh=-5, precipitation_mm=900, code=65)):
        for phase in ("dawn", "day", "dusk", "night"):
            p = mood.params(phase, w)
            assert 0.5 <= p.turbulence <= 1.8
            assert 0 <= p.energy <= 1
            assert 0.5 <= p.calm <= 1.2
            assert 0 <= p.tint_mix <= 1 and p.tint.startswith("#")


def test_works_without_weather():
    p = mood.params("night", None)
    assert p.tint == mood.TINTS["night"] and p.turbulence < 1


def test_unknown_weather_code_has_a_description():
    assert mood.describe(12345) == "unsettled"
