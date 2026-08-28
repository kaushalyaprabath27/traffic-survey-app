# Figures (D2/D3/D4)

## Figure 1: six-module composite (`figure1_module_composite.png`)

Real screenshots of all six modules' recording interfaces, not mockups. Generated via:

1. `take_screenshots.py` — serves the repository locally (`python -m http.server 8765` from the repo root) and uses Playwright (headless Chromium) to load each module with `?skipSetup=true&admin=<a registered admin ID>&...` (a deep-link the app itself supports, bypassing the setup form) and screenshot the resulting recording screen. Raw screenshots saved to `module_screenshots/`.
2. `build_composite.py` — arranges the six screenshots into a labeled 3x2 grid, saved as `figure1_module_composite.png` (used as Figure 1 in the manuscript).

**A real bug surfaced while building this**, unrelated to the figure itself: four of the six modules threw a JavaScript `ReferenceError` on load in a real browser (`loadOfflineQueue is not defined` in `roundabout/app.js`; `updateNetworkStatus is not defined` in `pedestrian/app.js` and `institutional-idling/app.js`; `processQueue is not defined` in `bus-idling/app.js`) — only `main-road` and `t-junction` loaded without error. The screenshots were still captured correctly by forcing the screen transition directly (see the `force_survey_js` workaround in `take_screenshots.py`), so the figure is accurate, but **these are real, live defects in the deployed frontend**, not an artifact of the screenshot method. They were not fixed here (out of scope for a figures task) and are reported in the round-2 final summary for the authors to address.

## Figure 3 / architecture diagram (D2)

Built directly as a TikZ figure in the manuscript's `.tex` source (not a separate file), since TikZ compiles natively to vector PDF without any DPI or SVG-conversion concern. See the manuscript source around `\begin{tikzpicture}` (Method details, before "Frontend") for the diagram definition — layered device UI -> local queue -> persistent backup -> service worker -> 15-second sync timer -> Apps Script Web App (routing / validity cache / rate limiter) -> per-administrator Sheet -> Admin Portal, with each stage colored by whether its behavior is measured, tested, or asserted from code inspection only.

## Graphical abstract (D4, `graphical_abstract.png`)

Replaces the previous graphical abstract, which depicted an "OFFLINE BACKUP" step with an email icon -- a visual reference to the Email Backup control that does not exist in this codebase (see the manuscript's Data integrity safeguards section and its author-decision flag). The new version (`build_graphical_abstract.py`) shows the five stages D4 asked for -- user, offline capture, batch sync, backend, validation -- with the batch-sync and validation figures pulled directly from measured results (Table 4, Table 5), not illustrative placeholders. 600x1500 px, above the 531x1328 px minimum.
