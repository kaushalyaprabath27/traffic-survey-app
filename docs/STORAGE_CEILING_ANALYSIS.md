# Storage Ceiling Analysis

This document gives the full derivation behind the manuscript's Storage
ceiling summary (Method details), moved here to keep the manuscript body
at the level of detail appropriate for a MethodsX method description
rather than an internal engineering audit.

## Event size

A serialized main-road event is 227 bytes; the other five modules range
from 227 to 271 bytes depending on field count. These byte counts were
measured as UTF-8 output. Every field in this data is plain ASCII
(surveyor names, dates, times, and vehicle-class labels drawn from a
fixed English-language set), so UTF-8 byte count and JavaScript string
length (UTF-16 code units) agree for this specific dataset regardless of
which one the browser actually meters against.

**That agreement doesn't settle which one the browser meters against —
a round-2 review comment correctly pointed this out.** Two counts being
equal for ASCII input says nothing about which quantity the browser is
actually counting; it only means the question can't be answered by
looking at ASCII data. See "Quota metering convention (measured)" below
for the actual empirical answer, obtained by testing a real browser
rather than by asserting a convention.

## Quota metering convention (measured)

Settled directly, not asserted: `analysis/storage_quota_probe.py` fills
`localStorage` in a real headless browser (served from an actual HTTP
origin — `about:blank`/`data:` URLs throw `SecurityError` on
`localStorage` access before any quota question can even be asked) with
two different fill characters via binary search for the exact accepted
length, then compares:

- **ASCII `'a'`**: 1 UTF-16 code unit, 1 UTF-8 byte per character.
- **Sinhala `'ක'` (U+0D9A)**: 1 UTF-16 code unit (Basic Multilingual
  Plane, no surrogate pair), 3 UTF-8 bytes per character.

**Result (Chromium 151.0.7922.34, via Playwright):** both fills accepted
exactly **5,242,875 characters** before `QuotaExceededError` — identical
character counts despite a 3x difference in UTF-8 byte size. This
confirms the quota is metered in UTF-16 code units, not raw bytes, for
this tested browser. 5,242,875 is 5 short of the commonly cited
5,242,880 (5 MB) figure, consistent with a few characters of overhead
for the storage key name itself.

This was tested in one browser engine and version only; it was not
repeated across Firefox, Safari, or other Chromium versions, so it is
reported as a measurement of the tested browser, not a claim about
browser behavior in general.

**Consequence for non-ASCII input**: since the tested browser meters
code units, not bytes, a Sinhala or Tamil surveyor name — both scripts
entirely within the Basic Multilingual Plane, one code unit per
character — costs the *same* quota per character as an ASCII name and
would not lower the ceiling below. This is the opposite of what a
byte-metering assumption would have predicted, and is why this ceiling
is stated as a code-unit budget throughout, not a byte budget with an
ASCII-only caveat.

## Combined budget

Because every recorded event is written to both the active sync queue and
a second, permanent backup copy that the application never clears (see
Data integrity safeguards in the manuscript), the two together consume
roughly twice the storage of the queue alone, and both live in the same
origin's `localStorage` budget.

Against a conservative 5 MB (5,242,880 code units) per-origin budget,
that combined usage reaches its ceiling at:

- approximately **11,500 events** using the smallest event size (227
  characters) — an optimistic bound
- approximately **9,700 events** using the largest (271 characters),
  which is the more representative figure for a mixed-module device

## Time-to-ceiling

At the 14 July field session's observed rate (458 events/hour):

- optimistic bound: ~25 hours of continuous offline operation
- pessimistic bound: ~21 hours

At the single-surveyor tap rate used in the load test (up to 3,600
events/hour per device), the range narrows to 3.2–2.7 hours.

Because the backup copy is never cleared across sessions, not just
within one, a device reused for repeated surveys over time accumulates
toward this ceiling cumulatively; it does not reset each time the device
is used.

## Failure pathway at the ceiling

What the application does when this ceiling is reached is not a designed
behavior. Inspection of the queuing code (`queueDataLocally`, called on
every recorded tap) shows the write to `localStorage` is not wrapped in
any error handling. A real browser enforces its storage quota by
throwing a `QuotaExceededError` from `localStorage.setItem` once the
budget is exhausted, and this code path does not catch it.

The practical consequence — whether the tap is silently lost, the
interface breaks, or some other failure mode results — was not tested
here. This is a code-confirmed but untested gap, carried into the
manuscript's Limitations section as a real risk for any survey long
enough, or device old enough, to approach the ceiling above.
