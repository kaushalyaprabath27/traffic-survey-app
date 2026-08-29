"""
Empirical localStorage quota-metering probe (MethodsX revision r2, A2-6).

The manuscript's storage-ceiling paragraph previously argued that UTF-8
byte count and UTF-16 code-unit count coincide for this application's
data because it is all-ASCII, and concluded no separate byte-based range
applies. A reviewer correctly pointed out this answers the wrong
question: the real ambiguity is code units vs. bytes, not UTF-8 vs.
UTF-16 code units, and ASCII data can't distinguish between the two
because they're numerically identical for ASCII by construction.

This script settles it empirically instead of by assertion. It fills
localStorage in a real headless browser with two different fill
characters and records the string length (character count) accepted
before QuotaExceededError:

  - ASCII 'a': 1 UTF-16 code unit, 1 UTF-8 byte per character.
  - Sinhala consonant character (U+0D9A, within the Basic Multilingual
    Plane, no surrogate pair): 1 UTF-16 code unit, 3 UTF-8 bytes per
    character (per RFC 3629 / UTF-8 encoding rules for the U+0800-U+FFFF
    range).

If the browser meters by UTF-16 code units, both fills should accept
approximately the same character count (code units are what's counted,
regardless of how many bytes each character takes when encoded).

If the browser meters by UTF-8 (or otherwise raw) byte count, the
Sinhala fill should accept roughly one-third the character count of the
ASCII fill, since each character costs 3x as many bytes.

Filling one key at a time, doubling a chunk, is impractically slow for
a ~5MB target with fine-grained detection of the exact cutoff, so this
uses a standard binary-search-by-string-length approach against a
single key, which is fast and gives an exact accepted-length reading.
"""
import http.server
import socket
import threading
import os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))

# localStorage throws SecurityError (not QuotaExceededError) on a
# non-HTTP origin like about:blank or a data: URL -- it needs a real
# origin to measure the actual quota behavior, so this serves the probe
# page over a throwaway local HTTP server rather than using
# page.set_content().
def free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))
    port = s.getsockname()[1]
    s.close()
    return port

port = free_port()
handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=HERE, **kw)
httpd = http.server.HTTPServer(("localhost", port), handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()

with sync_playwright() as p:
    browser = p.chromium.launch()
    version = browser.version
    page = browser.new_page()
    page.goto(f"http://localhost:{port}/_quota_probe.html")
    page.wait_for_function("window.__result !== undefined", timeout=60000)
    result = page.evaluate("window.__result")
    browser.close()

httpd.shutdown()

ascii_len = result["asciiLength"]
sinhala_len = result["sinhalaLength"]
ratio = ascii_len / sinhala_len if sinhala_len else float("inf")

print(f"Browser: Chromium {version}")
print(f"Max ASCII characters accepted:   {ascii_len:,}")
print(f"Max Sinhala characters accepted: {sinhala_len:,}")
print(f"Ratio (ascii / sinhala):         {ratio:.3f}")
print()
if ratio < 1.5:
    print("=> Ratio close to 1: quota is metered by UTF-16 code units, "
          "not raw bytes. A Sinhala character costs the same quota as an "
          "ASCII character despite using 3x the UTF-8 bytes.")
elif ratio > 2.5:
    print("=> Ratio close to 3: quota is metered by UTF-8 (or similar "
          "byte-oriented) encoding size, matching the reviewer's original "
          "concern.")
else:
    print("=> Ratio is ambiguous / between the two clean predictions -- "
          "report as inconclusive, do not force an interpretation.")
