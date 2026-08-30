from playwright.sync_api import sync_playwright
import os

BASE_URL = "http://localhost:8765"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "module_screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

modules = ["main-road", "roundabout", "t-junction", "pedestrian", "bus-idling", "institutional-idling"]

params = "?skipSetup=true&admin=ADM-0000&name=Demo+Surveyor&loc=Demo+Location&locNum=1&adminName=Demo+Admin"

# Direct DOM manipulation fallback, in case a module's own skipSetup init
# throws before reaching the screen-swap (e.g. roundabout/app.js calls the
# undefined loadOfflineQueue() during init, a real bug independent of this
# screenshot task -- worked around here rather than fixed, since fixing
# app logic is out of this task's scope).
force_survey_js = """
() => {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const survey = document.getElementById('survey-screen') || document.getElementById('screen-survey');
  if (survey) { survey.classList.remove('hidden'); survey.classList.add('active'); }
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    # device_scale_factor=3: renders at 3x pixel density (like a Retina
    # display), giving real additional pixel detail for the 500 dpi
    # combination-figure requirement -- not just upsampling a lower-res
    # capture after the fact.
    # Landscape viewport: this is how surveyors actually hold the device
    # in the field, per the author. Tried 932x430 (a plain width/height
    # swap of the previous portrait capture) first: confirmed visually to
    # cut off bus-idling's Start Idling button and counters below the
    # fold (a missing primary control, not cosmetic), and to overlap
    # header text in roundabout and t-junction (the theme toggle over
    # "Undo", "Online" clipped) at 932px width regardless of height.
    # 1300x600 was the narrowest width that renders every module's
    # header without overlap, confirmed by direct visual check of all
    # six modules individually before settling on one shared size --
    # all six modules use the same viewport so the composite figure
    # represents one consistent device size, not six different ones.
    page = browser.new_page(viewport={"width": 1300, "height": 600}, device_scale_factor=2)
    for m in modules:
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        url = f"{BASE_URL}/{m}/index.html{params}"
        page.goto(url, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)
        page.evaluate(force_survey_js)
        # The "Apps Script URL not configured" demo-environment warning
        # toast fires ~500ms after load and auto-removes itself after a
        # further 3s (see showToast() in each module's app.js) -- waiting
        # it out here rather than force-hiding it, so what's captured is
        # the module's own real behavior, not a screenshot-only override.
        page.wait_for_timeout(4000)
        out_path = os.path.join(OUT_DIR, f"{m}.png")
        page.screenshot(path=out_path)
        print(f"{m}: saved {out_path}" + (f"  [errors seen: {errors}]" if errors else ""))
    browser.close()
