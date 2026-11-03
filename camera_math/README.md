# Camera math

- `ptz_coverage.py` / `.json`: presets needed per row face and worst/best pixels per 30 mm fruit at each
  zoom step for one DS-2DE2A404IWG1-E (28 Oct 2026, 30 m row version).
- `camera_count_40m.py`: cameras per 40 m row from the pixel limit and the viewing-angle limit, and what
  3 cameras per row would require (2 Nov 2026). Run it: `python camera_count_40m.py`.

Result in short: pixels alone need 4 cameras per 40 m row (20 px at 4x) or 5 (30 px). The viewing angle
is the real limit: from a 0.3 m walkway 12-18 cameras (80-75 deg); 3 per row only works from >= ~1.2 m
away (e.g. a wide aisle) at 80 deg, and the far fruit then gets ~19 px.
