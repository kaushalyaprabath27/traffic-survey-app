"""
QuotaExceededError behavior probe (MethodsX revision r2, B2).

Tests, in a real browser against the actual app code (not a synthetic
localStorage-only test), what happens when a surveyor taps a vehicle
button after localStorage is already full: does the tap silently fail,
does the UI freeze, is the queue corrupted, is the backup queue also
affected, and does a later successful sync recover once space frees up.

Uses main-road, since it is one of the two modules (with t-junction)
that loads cleanly under the skipSetup deep-link without the
force_survey_js DOM-manipulation workaround figures/take_screenshots.py
needs for the other four modules (see figures/README.md).
"""
import http.server
import socket
import threading
import os
import json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)


def free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))
    port = s.getsockname()[1]
    s.close()
    return port


port = free_port()
handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=REPO_ROOT, **kw)
httpd = http.server.HTTPServer(("localhost", port), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

params = "?skipSetup=true&admin=ADM-0000&name=Probe+Surveyor&loc=Probe+Location&locNum=1&adminName=Probe+Admin"

with sync_playwright() as p:
    browser = p.chromium.launch()
    version = browser.version
    page = browser.new_page(viewport={"width": 430, "height": 932})
    console_errors = []
    page_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)))

    page.goto(f"http://localhost:{port}/main-road/index.html{params}", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(500)

    def queue_state():
        return page.evaluate("""
            () => ({
                queueLen: JSON.parse(localStorage.getItem('traffic_survey_offline_queue') || '[]').length,
                backupLen: JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]').length,
                counterText: (document.getElementById('counter-val') || {}).innerText,
            })
        """)

    def tap_first_vehicle_button():
        # First .vehicle-btn in the DOM (an "In" panel Bike button on main-road).
        page.locator(".vehicle-btn").first.click()
        page.wait_for_timeout(200)

    print(f"Browser: Chromium {version}")

    # --- Phase 1: baseline tap, empty storage ---
    console_errors.clear(); page_errors.clear()
    before = queue_state()
    tap_first_vehicle_button()
    after = queue_state()
    print("\n=== Phase 1: baseline tap (storage empty) ===")
    print("before:", before, " after:", after)
    print("console errors:", console_errors, " page errors:", page_errors)

    # --- Phase 2: fill localStorage to the exact byte via binary search on a
    # single filler key (same precise method as analysis/storage_quota_probe.py
    # -- a coarse chunked fill leaves too much slack: the queue write only
    # needs ~200-300 bytes, well inside a coarse fill's leftover headroom,
    # so a loose fill would under-test this and miss the actual boundary). ---
    fill_result = page.evaluate("""
        () => {
            // Preserve what's already there (the one queued event from Phase 1).
            let lo = 0, hi = 8 * 1024 * 1024;
            while (true) {
                try {
                    localStorage.setItem('__filler', 'x'.repeat(hi));
                    hi *= 2;
                    localStorage.removeItem('__filler');
                } catch (e) { break; }
            }
            while (lo < hi) {
                const mid = Math.floor((lo + hi + 1) / 2);
                try {
                    localStorage.setItem('__filler', 'x'.repeat(mid));
                    lo = mid;
                } catch (e) {
                    hi = mid - 1;
                }
            }
            localStorage.setItem('__filler', 'x'.repeat(lo));
            // Confirm truly no headroom left: even 1 more byte should throw.
            let confirmedFull = false;
            try {
                localStorage.setItem('__probe1byte', 'x');
                localStorage.removeItem('__probe1byte');
            } catch (e) {
                confirmedFull = true;
            }
            return { fillerLength: lo, confirmedFull };
        }
    """)
    print("\n=== Phase 2: filled localStorage to the exact byte ===")
    print("fill result:", fill_result)

    # --- Phase 3: tap with storage full ---
    console_errors.clear(); page_errors.clear()
    before = queue_state()
    tap_first_vehicle_button()
    after = queue_state()
    print("\n=== Phase 3: tap with storage full ===")
    print("before:", before, " after:", after)
    print("console errors:", console_errors, " page errors:", page_errors)
    print("queue changed:", before["queueLen"] != after["queueLen"])
    print("backup changed:", before["backupLen"] != after["backupLen"])
    print("counter changed:", before["counterText"] != after["counterText"])

    # Is the page still responsive after the failed tap? (UI freeze check)
    responsive = page.evaluate("() => 1 + 1")
    print("page still responsive (JS eval works):", responsive == 2)

    # Second tap with storage still full -- does the app get worse/better/same?
    console_errors.clear(); page_errors.clear()
    before2 = queue_state()
    tap_first_vehicle_button()
    after2 = queue_state()
    print("\n=== Phase 3b: second tap, still full ===")
    print("before:", before2, " after:", after2)
    print("console errors:", console_errors, " page errors:", page_errors)

    # --- Phase 4: free space, then tap again (recovery check) ---
    freed = page.evaluate("""
        () => {
            const had = localStorage.getItem('__filler') !== null;
            localStorage.removeItem('__filler');
            return had;
        }
    """)
    print(f"\n=== Phase 4: freed filler key: {freed} ===")
    console_errors.clear(); page_errors.clear()
    before = queue_state()
    tap_first_vehicle_button()
    after = queue_state()
    print("before:", before, " after:", after)
    print("console errors:", console_errors, " page errors:", page_errors)
    print("tap recovered (queue grew normally after space freed):", after["queueLen"] > before["queueLen"])

    browser.close()

httpd.shutdown()
