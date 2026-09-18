# Trek Map Layers

Source: NASA Moon Trek / Mars Trek WMTS services (https://trek.nasa.gov)
API docs: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars (and ?body=moon)
Rule: every tile URL used in the app must come from this file, and only from layers
whose Status is "tested".

---

## moon_global (REQUIRED — MVP)

- Layer name: LRO WAC Mosaic Global 303ppd (v02)
- Body / projection: Moon / EQ (equirectangular / simple cylindrical, global:
  lon −180..180, lat −90..90)
- Purpose: whole-Moon map for the Moon landing-site picker
- WMTS endpoint: https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02
- Leaflet URL template:
  https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg
- GetCapabilities URL (standard WMTS location, confirm it opens):
  https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml
- Local capabilities file: docs/api-samples/trek_moon_global_capabilities.xml
- Style: default
- TileMatrixSet: default028mm
- Format: jpg
- Tile size: 256 × 256 (verify TileWidth in the capabilities XML)
- Zoom range: 0 to 8 (safe default; source is 303 px/degree, so native detail runs out
  around zoom 7–8. Update from the last TileMatrix in the XML.)
- Test tile URLs (open each; an image = working):
  - Zoom 0 west half: https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg
  - Zoom 0 east half: https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/1.jpg
  - Shackleton / south pole (z3): https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/3/7/13.jpg
- Credit line: NASA/GSFC/Arizona State University (LRO LROC WAC), via NASA Moon Trek
- Status: ☑ tested (Ridwan, browser check 2026-09-18) ☑ capabilities saved

## mars_global (REQUIRED — MVP)

- Layer name: Mars Viking MDIM2.1 Colorized Global Mosaic 232m
- Body / projection: Mars / EQ (equirectangular / simple cylindrical, global:
  lon −180..180, lat −90..90)
- Purpose: whole-planet map for the Mars landing-site picker
- WMTS endpoint: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m
- Leaflet URL template:
  https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg
- GetCapabilities URL (standard WMTS location, confirm it opens):
  https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml
- Local capabilities file: docs/api-samples/trek_mars_global_capabilities.xml
- Style: default
- TileMatrixSet: default028mm
- Format: jpg
- Tile size: 256 × 256 (verify TileWidth in the capabilities XML)
- Zoom range: 0 to 7 (safe default; source is 256 px/degree. Update from the XML.)
- Test tile URLs (open each; an image = working):
  - Zoom 0 west half: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/0.jpg
  - Zoom 0 east half: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/1.jpg
  - Jezero crater (z3): https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/3/3/11.jpg
- Fallback if trek.nasa.gov fails for this layer: the same product is served through
  api.nasa.gov as .../mars-wmts/catalog/Mars_Viking_MDIM21_ClrMosaic_global_232m/...
  but that host requires the API key, so it must go through an /api route. Ask before using.
- Credit line: NASA Ames / USGS Astrogeology Science Center (Viking Orbiter MDIM 2.1),
  via NASA Mars Trek
- Status: ☑ tested (Ridwan, browser check 2026-09-18) ☑ capabilities saved

---

## Regional detail layers

Skipped for the MVP. Jezero and the lunar south pole are shown by zooming into the
global layers above. Revisit only in P2, and only with URLs copied from a working
Trek Preview.

---

## Reference locations (default map views and tests)

| Site                                | Latitude | Longitude | Zoom-3 tile on a global EQ layer (z/row/col) |
| ----------------------------------- | -------- | --------- | -------------------------------------------- |
| Jezero crater (Mars)                | 18.4°N   | 77.6°E    | 3/3/11                                       |
| Shackleton crater, lunar south pole | 89.7°S   | 129.8°E   | 3/7/13                                       |

Tile math for global EQ layers at zoom z: columns = 2^(z+1), rows = 2^z;
col = floor((lon + 180) / 360 × columns); row = floor((90 − lat) / 180 × rows).

## Notes for implementation (Claude Code)

- Tile path order is {TileMatrix}/{TileRow}/{TileCol} = {z}/{y}/{x}.
- Both layers are equirectangular (2 × 1 tiles at zoom 0), NOT Web Mercator.
  Leaflet must use L.CRS.EPSG4326, or tiles will be misaligned.
- Use maxNativeZoom = last zoom in the range above; allow the map to zoom 1–2 levels
  further by upscaling.
- Near the poles an equirectangular map is stretched sideways. That is expected; show a
  small note in the Moon south-pole view.
- Show each layer's credit line on the map (attribution) and on the Data Sources screen.
- Tiles load directly in the browser (no key needed). Do not proxy them.
- Only use layers whose Status is "tested".
