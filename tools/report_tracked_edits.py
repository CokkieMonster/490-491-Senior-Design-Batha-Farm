"""Apply the 29 Oct 2026 updates to the FaaS SDP report as tracked changes (author "Claude").

Each edit replaces text inside one run; only the words that actually change are marked
deleted/inserted, so reviewers see small, readable redlines. New table rows are inserted
as tracked rows copied from a neighbouring row.
"""
import re, sys

DOC = sys.argv[1]
TRACK = not (len(sys.argv) > 2 and sys.argv[2] == "--clean")
AUTH, DATE = "Claude", "2026-10-29T16:00:00Z"
s = open(DOC, encoding="utf8").read()
_id = [9100]


def nid():
    _id[0] += 1
    return _id[0]


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def run(rpr, text):
    return f'<w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r>' if text else ""


def drun(rpr, text):
    if not TRACK:
        return ""
    return f'<w:del w:id="{nid()}" w:author="{AUTH}" w:date="{DATE}"><w:r>{rpr}<w:delText xml:space="preserve">{text}</w:delText></w:r></w:del>' if text else ""


def irun(rpr, text):
    if not TRACK:
        return run(rpr, text)
    return f'<w:ins w:id="{nid()}" w:author="{AUTH}" w:date="{DATE}"><w:r>{rpr}<w:t xml:space="preserve">{text}</w:t></w:r></w:ins>' if text else ""


def _b(t, i):
    return i <= 0 or i >= len(t) or not (t[i - 1].isalnum() and t[i].isalnum())


def split_words(old, new):
    """Common prefix/suffix of old and new, snapped to word boundaries in both."""
    p = 0
    while p < min(len(old), len(new)) and old[p] == new[p]:
        p += 1
    while p > 0 and not (_b(old, p) and _b(new, p)):
        p -= 1
    q = 0
    while q < min(len(old), len(new)) - p and old[-1 - q] == new[-1 - q]:
        q += 1
    while q > 0 and not (_b(old, len(old) - q) and _b(new, len(new) - q)):
        q -= 1
    return old[:p], old[p:len(old) - q], new[p:len(new) - q], old[len(old) - q:]


def text_hits(needle):
    """Positions of needle inside live <w:t> text nodes (not deleted text)."""
    out = []
    for m in re.finditer(re.escape(needle), s):
        lt = s.rfind("<", 0, m.start())
        if s.startswith("<w:t>", lt) or s.startswith("<w:t ", lt):
            out.append(m.start())
    return out


def sub(old, new):
    global s
    eo = esc(old)
    hits = text_hits(eo)
    assert len(hits) == 1, f"{len(hits)} hits for: {old[:70]}"
    p = hits[0]
    a = max(s.rfind("<w:r>", 0, p), s.rfind("<w:r ", 0, p))
    b = s.find("</w:r>", p) + 6
    r = s[a:b]
    open_end = r.find(">") + 1
    m = re.match(r"(<w:rPr>.*?</w:rPr>)", r[open_end:], flags=re.S)
    rpr = m.group(1) if m else ""
    body = r[open_end + len(rpr):-6]
    rel = p - a - open_end - len(rpr)          # position of the match inside body
    ts = body.rfind("<w:t", 0, rel)
    te = body.find("</w:t>", rel) + 6
    tnode = body[ts:te]
    t = re.match(r"<w:t(?: [^>]*)?>([^<]*)</w:t>", tnode).group(1)
    i = rel - (ts + tnode.find(">") + 1)
    assert t[i:i + len(eo)] == eo
    before, after = t[:i], t[i + len(eo):]
    pre, o_mid, n_mid, suf = split_words(eo, esc(new))
    wrap = lambda kids: f"<w:r>{rpr}{kids}</w:r>" if kids else ""
    out = (wrap(body[:ts]) + run(rpr, before + pre) + drun(rpr, o_mid) + irun(rpr, n_mid)
           + run(rpr, suf + after) + wrap(body[te:]))
    s = s[:a] + out + s[b:]


def insert_row_after(anchor, cells):
    """Copy the table row holding `anchor`, fill its cells with `cells`, insert it below as a tracked row."""
    global s
    hits = text_hits(esc(anchor))
    assert len(hits) == 1, f"{len(hits)} hits for row anchor {anchor[:50]}"
    p = hits[0]
    a = s.rfind("<w:tr ", 0, p)
    b = s.find("</w:tr>", p) + 7
    row = re.sub(r' w14:(paraId|textId)="[^"]*"', "", s[a:b])
    if not TRACK:
        pass
    elif "<w:trPr>" in row:
        row = row.replace("</w:trPr>", f'<w:ins w:id="{nid()}" w:author="{AUTH}" w:date="{DATE}"/></w:trPr>', 1)
    else:
        row = re.sub(r"(<w:tr[^>]*>)", rf'\1<w:trPr><w:ins w:id="{nid()}" w:author="{AUTH}" w:date="{DATE}"/></w:trPr>', row, 1)
    tcs = re.findall(r"<w:tc>.*?</w:tc>", row, flags=re.S)
    assert len(tcs) == len(cells), (len(tcs), len(cells))
    new_tcs = []
    for tc, text in zip(tcs, cells):
        tcpr = re.search(r"<w:tcPr>.*?</w:tcPr>", tc, flags=re.S)
        ppr = re.search(r"<w:pPr>.*?</w:pPr>", tc, flags=re.S)
        rpr = re.search(r"<w:rPr>.*?</w:rPr>", tc[tc.find("<w:r>"):] if "<w:r>" in tc else "", flags=re.S)
        ppr_x = ppr.group(0) if ppr else "<w:pPr></w:pPr>"
        if TRACK:
            ppr_x = ppr_x.replace("</w:pPr>", f'<w:rPr><w:ins w:id="{nid()}" w:author="{AUTH}" w:date="{DATE}"/></w:rPr></w:pPr>')
        new_tcs.append("<w:tc>" + (tcpr.group(0) if tcpr else "") + "<w:p>" + ppr_x + irun(rpr.group(0) if rpr else "", esc(text)) + "</w:p></w:tc>")
    head = row[: row.find("<w:tc>")]
    s = s[:b] + head + "".join(new_tcs) + "</w:tr>" + s[b:]


# ---------------- Table 1.1: design items still being decided ----------------
sub("Size, number of rows, row spacing, row width, roof height and mounting structure are not confirmed; earlier notes used both about 40 cm and about 2 m between rows. Working assumption: 8 m by 32 m. A site survey is the first action.",
    "Not yet surveyed. The October site visit gave about 30 m by 8 m with single rows about 1 m apart; the farm now describes its planting area as about 40 m by 8 m, split into about 14 customer patches. Working assumption: 30 m by 8 m with six rows, as in the tilt study (Section 4.2.3). A site survey is the first action.")
sub("The advisor's pick, Reolink RLC-823S1, or the cheaper Hikvision DS-2DE2A404IW-DE3. Chosen after a bench test with a written checklist: pan, tilt and zoom readout, how closely a saved view repeats, closest focus, lens distortion, image quality on plants.",
    "Bought: Hikvision DS-2DE2A404IWG1-E (4 MP, 4x optical zoom, PoE, ONVIF and ISAPI), arrived in late October 2026. The bench test checks it against a written checklist: pan, tilt and zoom readout, how closely a saved view repeats, closest focus, lens distortion, image quality on plants. The Reolink RLC-823S1 is the alternative if it fails a check.")
sub("Overhead, at aisle ends or on posts along the aisles. The advisor suggests 3 to 4 cameras per 30 m; a sizing rule based on aisle width gives about 12 for the assumed layout. A mounting test will photograph marked cells from 1, 3 and 5 m.",
    "Overhead, at aisle ends or on posts along the aisles. A simulated tilt test (October 2026) suggests two cameras per row are enough if each view is perspective-corrected and zoomed, about 12 for six rows; the advisor's earlier figure was 3 to 4 per 30 m. A mounting test with the real camera will photograph marked cells from 1, 3, 5 and 7 m.")
sub("No error target has been agreed. Whether the output is a fruit count or a weight per row; weight is proposed, with the count kept as the intermediate result.",
    "The advisors asked for an engineering criterion rather than near-perfect detection, and gave about 20% error per row as acceptable (29 October 2026); to be confirmed with Albatha Farm. Whether the output is a fruit count or a weight per row; weight is proposed, with the count kept as the intermediate result.")
sub("Proposed: try existing open-source detectors on the stored images first, and fine-tune a YOLO-family detector only if none meets a pass mark set in advance.",
    "Existing detectors were tested without training on the team's greenhouse photos (October 2026) and are not accurate enough (Section 4.3.5). Decided: fine-tune a detector on the farm's labelled images and on synthetic images. Open: which model family (YOLO, DETR-type or DINO-based).")

# ---------------- Chapter 1 ----------------
sub("It also checks its own cameras and tells a farm worker in plain language when one needs attention. An operator reads the results on a web dashboard.",
    "It also checks its own cameras and tells a farm worker in plain language when one needs attention. An operator reads the results on a web dashboard. In the current setup, Albatha Farm has divided the planting area into about 14 patches, and each customer rents one leafy-crop and one fruiting-crop patch. Fruiting crops are photographed from the side; leafy crops are photographed from above, where estimating weight or volume is more useful than counting.")

# ---------------- Chapter 3 ----------------
sub("FaaS customer (row renter)", "FaaS customer (renter of a row or patch)")
sub("The target is TBD (Table 1.1); 15% is proposed as a starting point.",
    "The target is TBD (Table 1.1); about 20% is proposed, following the advisors' guidance of 29 October 2026, to be confirmed with Albatha Farm.")

# ---------------- 4.2.2 Camera selection ----------------
sub("Hikvision DS-2DE2A404IW-DE3 PTZ camera: 4 MP, 4x zoom, PoE", "Hikvision DS-2DE2A404IWG1-E PTZ camera (bought): 4 MP, 4x zoom, PoE")
sub("The advisor asked for the analysis to be done on the Reolink RLC-823S1, and a cheaper Hikvision DS-2DE2A404IW-DE3 was also put forward. Table 4.2 ",
    "The advisor asked for the analysis to be done on the Reolink RLC-823S1, and a cheaper Hikvision PTZ camera was also put forward; after the advisor meeting of 22 October 2026 the team bought the Hikvision DS-2DE2A404IWG1-E. Table 4.2 ")
sub("Hikvision DS-2DE2A404IW-DE3", "Hikvision DS-2DE2A404IWG1-E (bought)")  # Table 4.2 header
sub('4 MP (2560 × 1440), 1/3" sensor', '4 MP (2560 × 1440), 1/2.8" sensor')
sub("2.8 to 12 mm, about 97 to 32 degrees (4x)", "2.8 to 12 mm, 99.4 to 32.8 degrees (4x)")
sub("360 degrees pan; tilt to confirm", "0 to 355 degrees pan; tilt 0 to 90 degrees, downward only")
sub("PoE, type to confirm", "PoE (802.3af) or 12 V DC; 9.2 W maximum")
sub("ISAPI and ONVIF. Pan, tilt and zoom normally reported through ISAPI.",
    "ISAPI, ONVIF (Profile S, G and T) and RTSP. Pan, tilt and zoom status reported; checked on the bench.")
sub("The proposal is to test one of each on the bench against a checklist written beforehand (Table 4.3) and choose from the results, not from the specifications.",
    "For these reasons the team chose the Hikvision and bought one. It is tested on the bench against a checklist written beforehand (Table 4.3), and the Reolink is tried only if it fails a check. Two limits of the Hikvision shape the design: it has no Wi-Fi, so each camera needs one Power over Ethernet cable, which the advisors accepted; and it tilts only from horizontal downwards, so it is mounted above the highest fruit.")

# ---------------- 4.2.3 Mounting and camera count ----------------
sub("A camera in an aisle sees a row face well only over a stretch about as long as the aisle is wide; beyond that the angle is too shallow. So the cameras needed per aisle is roughly the row length divided by the aisle width. On the working assumption of an 8 m by 32 m greenhouse this gives about 12 cameras. The advisor's figure is 3 to 4 cameras per 30 m, so that each camera looks up to 4 to 5 m each way. Resolution allows that: zoomed in at 5 m, a 6 cm tomato is still about 80 pixels across on the Reolink. The limit is the angle. From 1.5 m off the row face, a point 5 m along the row is seen at about 17 degrees to the face, so nearer plants hide farther ones and fruit are more often placed in the wrong cell. Mounting the cameras higher, looking down along the aisle, improves the angle. The two figures differ by about three times, so the mounting test will photograph the same marked cells from 1, 3 and 5 m along the aisle and compare the counts with hand counts.",
    "A camera sees a row face well only while its view is not too slanted; beyond that, nearer leaves hide farther fruit and fruit are more often placed in the wrong cell. Resolution is not the limit: zoomed in at 5 m, a 6 cm tomato is still about 55 pixels across on the Hikvision. The advisor's first figure was 3 to 4 cameras per 30 m, so that each camera looks up to 4 to 5 m each way. A simulated tilt test in October 2026 went further. Public greenhouse tomato photos were tilted to mimic slanted views and run through a detector. Without correction it found fewer than half of the tomatoes at 60 degrees and none at 80 degrees; when each view was straightened onto the row face (perspective correction) and zoomed three times, it found as many as in the straight-on photos up to 85 degrees. With two cameras per row, 14 m apart, the steepest view is about 82 degrees, so on the working layout of six rows about 12 cameras would be enough, and fewer cameras also means less overlap to de-duplicate. The test has limits: the photos were taken straight-on in even light, the real camera also looks down onto the row, and tilting a flat photo cannot show leaves hiding fruit. The mounting test therefore photographs the same marked cells from 1, 3, 5 and 7 m along the row with the real camera and compares the counts with hand counts.")

# ---------------- 4.2.5 Network and power ----------------
sub("The Reolink needs 802.3at power, which supplies up to 30 W per port at the switch, so the switch is chosen with 802.3at ports and a total power budget that covers every camera at its rated maximum.",
    "The Hikvision draws at most 9.2 W and runs on standard 802.3af power (up to 15.4 W per port at the switch). The switch is chosen with a total power budget that covers every camera at its rated maximum, and with 802.3at ports in case the higher-power Reolink is used.")

# ---------------- 4.2.6 Farm server storage ----------------
sub("About 2.6 TB of stills over five years (estimate below); a mirror survives one disk failing",
    "About 1.3 TB of stills over five years (estimate below); a mirror survives one disk failing")
sub("At about 2 MB per 8 MP still, that is about 1.4 GB a day, 0.5 TB a year and 2.6 TB over five years.",
    "At about 1 MB per 4 MP still from the chosen camera, that is about 0.7 GB a day, 0.26 TB a year and 1.3 TB over five years.")

# ---------------- 4.3.5 Crop perception ----------------
sub("The detector is still open: existing open-source detectors are tried on the stored stills first, and a detector is trained only if none meets the pass mark.",
    "Existing detectors were tried first, without training, on the team's own greenhouse photos: the best, RT-DETR-L, put a box on 83% of the checked fruit, but only 44% of its boxes were fruit, most of the wrong ones being yellow flowers, pale leaves and fruit fallen on the soil, and it cannot tell ripe from unripe. The detector is therefore fine-tuned on the farm's labelled stills and on synthetic images rendered from 3D plant models, which cover fruit sizes, colours, viewing angles and lighting not yet seen on the farm; YOLO, DETR-type and DINO-based detectors are compared against the untrained results as a baseline. Large stills are processed in overlapping tiles so that small fruit keep their pixels [7], and steep views are straightened onto the row face before detection.")

# ---------------- 4.4 Standards ----------------
sub("IEEE 802.3 Ethernet and Power over Ethernet (802.3at) [27]", "IEEE 802.3 Ethernet and Power over Ethernet (802.3af and 802.3at) [27]")
sub("One cable per camera carries both data and power. The Reolink candidate needs the higher-power 802.3at type.",
    "One cable per camera carries both data and power. The Hikvision uses 802.3af; the Reolink alternative would need the higher-power 802.3at type.")

# ---------------- 4.5 Alternatives ----------------
sub("Existing detectors are tried first; training needs labels and possibly the farm's approval to move images.",
    "Fine-tuning a pre-trained detector needs far fewer labels. Existing detectors used without training were tested and are not accurate enough (Section 4.3.5), so one is fine-tuned.")

# ---------------- Chapter 7 ----------------
sub("proves the camera geometry in software, and tests candidate cameras on the bench.",
    "proves the camera geometry in software, and tests the chosen camera on the bench.")
sub("Procure two bench cameras, PoE switch and calibration kit", "Procure the bench camera (bought, arrived late October), PoE switch and calibration kit")
sub("Bench test of both cameras against the checklist; real sweep of a scene with a known count (stage 3)",
    "Bench test of the camera against the checklist, including perspective correction; real sweep of a scene with a known count (stage 3)")
sub("Fruit detection, ripeness and leaf damage on farm images", "Fine-tune fruit detection, ripeness and leaf damage on farm and synthetic images")
sub("Waiting for the bench cameras", "Camera bought (Hikvision DS-2DE2A404IWG1-E) and arrived in late October 2026; bench test starting")
insert_row_after("Tomato detector trial on public photos (Laboro Tomato)", [
    "Tilt and perspective-correction test (simulated on 90 public photos)",
    "Without correction, fewer than half of the tomatoes were found at 60 degrees and none at 80 degrees. With each view straightened and 3x zoom, recall stayed at the straight-on level (about 0.69) up to 85 degrees. Leaves and distance are not modelled; to be repeated with the real camera.",
])
insert_row_after("Tomato detector trial on public photos (Laboro Tomato)", [
    "Untrained detectors on the team's greenhouse photos",
    "Four ready-made detectors run on 10 greenhouse photos (5 with fruit, 5 without), checked by eye. The best, RT-DETR-L, found 83% of 52 fruit, but only 44% of its boxes were fruit. Decision: fine-tune on farm and synthetic images.",
])
sub("Cheaper option with a higher temperature rating and a documented pan, tilt and zoom readout [25].",
    "The chosen camera: higher temperature rating and a documented pan, tilt and zoom readout [25]. Estimate; replace with the receipt amount.")
sub("Bench test, real sweep (stage 3) and the live detector demonstration [24].",
    "Alternative, bought only if the Hikvision fails a bench-test check [24].")
sub("Only one camera of each model is in the estimate. The cameras for the whole greenhouse are bought after the bench and mounting tests have chosen the model and the count. With the sizing rule's estimate of about 12 cameras for the assumed 8 m by 32 m layout,",
    "The estimate keeps one Reolink in case the Hikvision fails a bench-test check. The cameras for the whole greenhouse are bought after the bench and mounting tests have confirmed the model and the count. With about 12 cameras for the working layout (two per row, six rows),")
sub("Two PTZ network cameras of different models on the bench, later in the greenhouse;",
    "The Hikvision PTZ network camera on the bench (a Reolink as the alternative), later in the greenhouse;")
sub("Train on a machine on the farm. Try existing detectors first.",
    "Train on a machine on the farm, and on synthetic images that need no farm photos.")
sub("Agree the data collection phase with the farm early. Use public datasets meanwhile. Start the hidden-fruit estimate",
    "Agree the data collection phase with the farm early. Use public datasets and synthetic images from 3D plant models meanwhile. Start the hidden-fruit estimate")
sub("3D reconstruction is deferred. Existing detectors are tried before training new ones.",
    "3D reconstruction is deferred. Pre-trained detectors are fine-tuned rather than trained from scratch.")

# ---------------- Chapter 8 ----------------
sub("Open design decisions, in particular the greenhouse layout, the camera model, mounting and count, the accuracy target and the data collection phase,",
    "Open design decisions, in particular the greenhouse layout, camera mounting and count, the accuracy target and the data collection phase,")
sub("Before the end of Senior Design I the team will test both candidate cameras on the bench and demonstrate the tomato detector on a live camera.",
    "Before the end of Senior Design I the team will test the camera on the bench, including perspective correction on real views, demonstrate the tomato detector on a live camera, and start generating synthetic training images from 3D plant models. Leafy crops will be imaged from above, with weight or volume estimated instead of a count.")

# ---------------- References ----------------
sub('Hikvision, "DS-2DE2A404IW-DE3 4 MP 4X network IR mini PTZ camera: datasheet."',
    'Hikvision, "DS-2DE2A404IWG1-E 4 MP 4X IR mini outdoor AcuSense PTZ camera: datasheet."')
sub("IEEE Standard for Ethernet, IEEE Std 802.3 (including the Power over Ethernet amendment IEEE 802.3at).",
    "IEEE Standard for Ethernet, IEEE Std 802.3 (including the Power over Ethernet amendments IEEE 802.3af and IEEE 802.3at).")

open(DOC, "w", encoding="utf8").write(s)
print("done; tracked ids used:", _id[0] - 9100)
