"""How many Hikvision DS-2DE2A404IWG1-E cameras a 40 m row needs (worked out 2 Nov 2026).

Two limits, whichever needs more cameras wins:
  1. Pixels: a 30 mm cherry tomato needs >= 20 px across. At full 4x optical zoom (12 mm) that holds
     only up to about 6.5 m away (digital zoom adds no real pixels).
  2. Viewing angle: from a camera D metres from the row face, the row is seen at angle theta from head-on
     at a distance D*tan(theta) along the row. Steeper than ~75-80 deg, leaves hide most fruit
     (a leaf sticking out 10 cm hides 10 cm * tan(theta) of row behind it).
Each camera covers 2 * reach of row (half each way); cameras per row = ceil(row length / coverage).
"""
import math

ROW = 40.0                    # m, corrected row length
FRUIT = 0.030                 # m, cherry tomato
NEED_PX = 20                  # px across a fruit for a detector
SENSOR_W, RES = 5.58, 2560    # mm, px (1/2.8" 16:9 active width)
DH = 0.8                      # m, height difference camera-fruit (camera ~1.2 m, fruit 0.4-1.9 m)


def tan_half_hfov(f):
    """tan(half HFOV) = a + b/f, fitted to the datasheet: 99.4 deg at 2.8 mm, 32.8 deg at 12 mm."""
    tw, tt = math.tan(math.radians(99.4 / 2)), math.tan(math.radians(32.8 / 2))
    b = (tw - tt) / (1 / 2.8 - 1 / 12.0); a = tt - b / 12.0
    return a + b / f


def focal_px(f):
    return (RES / 2) / tan_half_hfov(f)


def max_distance(f, need=NEED_PX):
    return focal_px(f) * FRUIT / need


print("Pixel limit (30 mm fruit):")
for f in (2.8, 5.6, 8.4, 12.0):
    print(f"  {f:4.1f} mm ({f/2.8:.0f}x): 20 px up to {max_distance(f):.2f} m, 30 px up to {max_distance(f, 30):.2f} m")

for need in (20, 30):
    dmax = max_distance(12.0, need)
    reach = math.sqrt(max(dmax**2 - 0.3**2 - DH**2, 0))
    print(f"Pixels only, {need} px at 4x: reach {reach:.2f} m each way -> {math.ceil(ROW / (2 * reach))} cameras per {ROW:.0f} m row")

print("\nViewing-angle limit, cameras per 40 m row:")
print("  D (m)  " + "  ".join(f"{a}deg" for a in (60, 70, 75, 80, 85)))
for D in (0.3, 0.8, 1.2):
    row = [math.ceil(ROW / (2 * D * math.tan(math.radians(a)))) for a in (60, 70, 75, 80, 85)]
    print(f"  {D:4.1f}   " + "    ".join(f"{n:3d}" for n in row))

print("\nWhat 3 cameras per row would need (each covers 13.3 m, far fruit 6.67 m along the row):")
half = ROW / 3 / 2
for a in (75, 80, 85):
    print(f"  {a} deg max: camera >= {half / math.tan(math.radians(a)):.2f} m from the row face; "
          f"a 10 cm leaf hides {0.1 * math.tan(math.radians(a)):.2f} m of row")
for D in (0.3, 0.8, 1.2):
    d = math.sqrt(half**2 + D**2 + DH**2)
    print(f"  D = {D} m: far fruit {d:.2f} m away -> {focal_px(12.0) * FRUIT / d:.1f} px at 4x, seen at {math.degrees(math.atan(half / D)):.1f} deg")
