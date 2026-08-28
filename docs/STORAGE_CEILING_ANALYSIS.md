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
fixed English-language set), so UTF-8 byte count, JavaScript string
length, and the UTF-16 code units a browser actually enforces
`localStorage` quotas in all agree for this data.

This would not hold for a non-ASCII surveyor name or location label,
where UTF-8 byte count and the UTF-16 code-unit count a browser meters
against can diverge. The figures below should be read as counting code
units (characters), which is what a browser's quota actually limits, not
disk bytes.

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
