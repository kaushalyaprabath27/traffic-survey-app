from playwright.sync_api import sync_playwright
import os

BASE_URL = "http://localhost:8765"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "module_screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

modules = ["main-road", "roundabout", "t-junction", "pedestrian", "bus-idling", "institutional-idling"]

params = "?skipSetup=true&admin=ADM-5505&name=Demo+Surveyor&loc=Demo+Location&locNum=1&adminName=Demo+Admin"

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
    page = browser.new_page(viewport={"width": 430, "height": 932}, device_scale_factor=3)
    for m in modules:
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        url = f"{BASE_URL}/{m}/index.html{params}"
        page.goto(url, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)
        page.evaluate(force_survey_js)
        page.wait_for_timeout(300)
        out_path = os.path.join(OUT_DIR, f"{m}.png")
        page.screenshot(path=out_path)
        print(f"{m}: saved {out_path}" + (f"  [errors seen: {errors}]" if errors else ""))
    browser.close()
