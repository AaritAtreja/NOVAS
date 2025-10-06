# LEO Risk Map (Pro v2.2)

A dark-theme Leaflet web app that estimates **collision risk** for a proposed LEO mission using an **ORDEM-style flux** dataset, plus a **swath selection** tool for a simple density score. Runs entirely in the browser—no backend required.

## What it does
- Set **Altitude (km)** and **Inclination (deg)** for the orbit.
- Select a debris **Size bin (mm)** (e.g., 1–3, 3–10, 10–20).
- Enter **Effective cross-section (m²)** of the spacecraft (average “shadow” area exposed to debris).
- Draw a **swath** (rectangle/polygon) on the map to get **Swath area (km²)** and a **Density score** (Low/Med/High) that blends relative ORDEM flux with corridor size.
- See live outputs: **Flux**, **P(≥1)** via Poisson, **Swath area**, **Density score**.

## Math (short)
\[
P(\ge 1) = 1 - e^{-F \cdot A \cdot \Delta t}
\]
- \(F\): debris flux (impacts·m⁻²·yr⁻¹) from the ORDEM-style CSV  
- \(A\): spacecraft effective cross-section (m²)  
- \(\Delta t\): exposure time (years) = months/12

## Runtime / How to Run
You can run the app locally **either with Python** or **with Node.js**. Choose one:

**Option A — Python (built-in)**
```bash
# from the project folder
python -m http.server 8000
# if "python" isn't found on Windows:
py -m http.server 8000
