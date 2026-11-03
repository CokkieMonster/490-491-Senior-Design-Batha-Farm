# Simulator and dataset generator

Both apps share `src/core.js`: the greenhouse layouts, procedural plants, the Hikvision lens model and
the pixel-exact label pass. `build.py` assembles them into single HTML files in `dist/`.

| File | Role |
|---|---|
| `src/core.js` | Layouts (Albatha 40 m rows; university fruit arch; university leafy arch), plant growth by season date, materials, lens model, render pipeline (overscan render -> depth of field -> barrel distortion), target finding, label pass, YOLO boxes. |
| `src/sim_shell.html`, `src/sim_app.js` | Simulator UI: camera image, straightened view, overview, readouts, fruit table, pinhole diagram, presets, season slider, test board. |
| `src/gen_shell.html`, `src/gen_app.js` | Dataset generator UI: random camera shots, random lighting, new greenhouse every N images, writes YOLO files to a folder (File System Access API) or zip parts. |
| `assets/farm_photo.jpg` | Farm photo used on the simulator's test board (Meera's tilt test preset). |
| `tests/render_check.py` | Headless Playwright check that renders a few views and label overlays. |

## Greenhouses
- **Albatha farm rows:** 40 m rows, 3 tomato hedges + 2 cucumber rows, narrow walkways (~0.3 m between leaf tips), gravel main aisle, arched film roof (gutter 3.0 m, ridge 4.8 m). Built from the farm photos.
- **University arch 1 (fruit) / arch 2 (leafy):** 40 x 8 m (length corrected Nov 2026), 14 plots of 4.00 x 3.50 m, 1.00 m walkways between plots, 1.00 m central walkway, 3 m free at each end. Lines per plot from drawings GH-02/GH-03: round tomato 8 @ 0.50 m, cherry tomato 8 @ 0.50 m, capsicum 10 @ 0.40 m, cucumber 4 + zucchini 4 @ 0.50 m (lines 0.875 m apart); leafy: baby kale, rocca, spinach bands 0.60 m, then rosemary | thyme | coriander. Growth follows the production plans (day 0 = 1 Nov 2026). Arch height (2.6 m side, 4.2 m ridge) is assumed.

## Camera model (Hikvision DS-2DE2A404IWG1-E)
1/2.8" sensor 5.58 mm wide, 2560 x 1440, 2.8-12 mm. Horizontal angle of view follows the datasheet
(tan(half-HFOV) = a + b/f through 99.4 deg at 2.8 mm and 32.8 deg at 12 mm); barrel distortion from a
one-term division model fitted so the frame edge matches the datasheet angle, fading to none at 12 mm.
Assumptions: F1.8 at 2.8 mm rising to F2.8 at 12 mm (datasheet gives only max F1.8); effective focal
length at the long end ~9.5 mm. Pan 0-355 deg, tilt 0-90 deg down only. Free-lens mode allows any lens.

## Known limits
- Plants are procedural: leaf shapes, fruit and lighting are close to the photos but not photographic.
- Fallen fruit on the ground is not modelled (decide whether it should be labelled).
- Leafy plots carry no labels (nothing to count); they can be saved as negative images.
