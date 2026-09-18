#!/usr/bin/env bash
set -euo pipefail
: "${NASA_API_KEY:?Run Task 5 first}"
OUT=docs/api-samples

# DONKI: recent window + a known-active window (May 2024 storms) for testing/fallback
for t in FLR SEP CME GST; do
  curl -sS "https://api.nasa.gov/DONKI/$t?startDate=2026-08-19&endDate=2026-09-18&api_key=$NASA_API_KEY" -o "$OUT/donki_${t}_recent.json"; sleep 1
done
for t in FLR SEP CME; do
  curl -sS "https://api.nasa.gov/DONKI/$t?startDate=2024-05-01&endDate=2024-05-20&api_key=$NASA_API_KEY" -o "$OUT/donki_${t}_2024-05.json"; sleep 1
done

# JPL Horizons (no key): Earth-Mars and Earth-Moon distance
H="https://ssd.jpl.nasa.gov/api/horizons.api?format=json&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&CENTER=%27500@399%27&START_TIME=%272026-09-18%27&STOP_TIME=%272026-09-20%27&STEP_SIZE=%271%20d%27&QUANTITIES=%2720%27"
curl -sS "$H&COMMAND=%27499%27" -o "$OUT/horizons_mars.json"
curl -sS "$H&COMMAND=%27301%27" -o "$OUT/horizons_moon.json"

# NASA Image and Video Library (no key)
curl -sS "https://images-api.nasa.gov/search?q=MOXIE&media_type=image" -o "$OUT/images_moxie.json"
curl -sS "https://images-api.nasa.gov/search?q=Veggie%20plant%20growth&media_type=image" -o "$OUT/images_veggie.json"
echo "Done."