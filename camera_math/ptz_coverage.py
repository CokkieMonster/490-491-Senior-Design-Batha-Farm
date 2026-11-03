"""Coverage math for one Hikvision DS-2DE2A404IWG1-E looking at a vertical row face.
Datasheet: 2560x1440, 2.8-12 mm, HFOV 99.4..32.8 deg, VFOV 51.7..18.4 deg, tilt 0..90 deg (cannot look up)."""
import math, json
W_PX, H_PX = 2560, 1440
F_W, F_T = 2.8, 12.0
# tan(half-FOV) = a + b/f, fitted to the datasheet's wide and tele FOV (keeps both endpoints exact)
def _fit(wide, tele):
    tw, tt = math.tan(math.radians(wide/2)), math.tan(math.radians(tele/2))
    b = (tw-tt)/(1/F_W-1/F_T); a = tt-b/F_T; return a, b
AH, BH = _fit(99.4, 32.8); AV, BV = _fit(51.7, 18.4)
def fov(f):
    return (2*math.degrees(math.atan(AH+BH/f)), 2*math.degrees(math.atan(AV+BV/f)))
FRUIT = 30.0      # mm, cherry tomato
NEED = 20         # px across a fruit for counting (<=1.5 mm/px)
OVL = 0.25        # overlap between neighbouring presets
H_CAM = 2.2       # m, mounted just under the 2.4 m crop poles
Z_LO, Z_HI = 0.3, 2.0   # fruit zone on the face
ZOOMS = [2.8, 4.2, 5.6, 7.0, 8.4, 10.0, 12.0]
def plan(D, S):
    """camera at distance D (m) from face, covering +-S (m) along the row."""
    res=[]
    pan = 2*math.degrees(math.atan(S/D))
    t_hi = math.degrees(math.atan((H_CAM-Z_LO)/D))          # steepest look-down (x=0, bottom)
    t_lo = math.degrees(math.atan((H_CAM-Z_HI)/math.hypot(D,S)))  # shallowest (ends, top)
    tilt = t_hi - t_lo
    r_worst = math.sqrt(D*D+S*S+(H_CAM-Z_LO)**2)
    for f in ZOOMS:
        hf, vf = fov(f)
        ifov = math.radians(hf)/W_PX
        px = FRUIT/(r_worst*1000*ifov)
        n_pan = max(1, math.ceil((pan - hf*OVL)/(hf*(1-OVL)))) if pan>hf else 1
        n_tilt = max(1, math.ceil((tilt - vf*OVL)/(vf*(1-OVL)))) if tilt>vf else 1
        res.append(dict(f=f, zoom=round(f/F_W,1), hfov=round(hf,1), vfov=round(vf,1), px_worst=round(px,1),
                        px_best=round(FRUIT/(D*1000*ifov),1), presets=n_pan*n_tilt, n_pan=n_pan, n_tilt=n_tilt))
    ok=[r for r in res if r['px_worst']>=NEED]
    best=min(ok,key=lambda r:r['presets']) if ok else None
    return dict(D=D,S=S,pan=round(pan,1),tilt=round(tilt,1),r_worst=round(r_worst,2),options=res,best=best)
out=[]
for D in (0.3,0.5,1.0,1.5):
    for S in (1.5,3.0,5.0):
        p=plan(D,S); out.append(p)
        b=p['best']
        pass
        print(f"D={D} m  span ±{S} m: pan {p['pan']}°, tilt {p['tilt']}°, farthest fruit {p['r_worst']} m ->",
              (f"zoom {b['zoom']}x, {b['presets']} presets ({b['n_pan']}x{b['n_tilt']}), worst {b['px_worst']} px, nearest {b['px_best']} px" if b else "NO zoom reaches 20 px"))
json.dump(out,open('ptz_coverage.json','w'),indent=1)
print('FOV check', [ (f,[round(x,1) for x in fov(f)]) for f in ZOOMS])
