# Main-Road Discrepancy Analysis

This document gives the full per-discrepancy detail behind the manuscript's
Method validation summary for the main-road session (14 July 2026), moved
here to keep the manuscript body at a method-summary level of detail rather
than a per-timestamp forensic audit.

## Tolerance-sensitivity check

Matching was performed at a two-second tolerance (Ground-truth extraction
and matching, in the manuscript). Re-matching at other tolerances (1, 2, 3,
5 seconds) to test sensitivity to that choice would require the full
unmatched raw timestamp lists from both the application export and the
video-derived record. These were not retained as a separate file for the
main-road session, so they cannot be reconstructed from the published
discrepancy list (Table 6) alone. This tolerance-sensitivity analysis is
therefore not repeated; it is named as a limitation in the manuscript
instead.

## Are the three unmatched entries genuine false positives?

What can be checked from Table 6 as published is the temporal gap between
each unmatched entry and the nearest missed detection, to assess whether an
unmatched entry could plausibly be the same physical vehicle as a nearby
missed detection, simply mismatched at this tolerance.

| Unmatched entry | Nearest missed detection | Gap | Same class? | Verdict |
|---|---|---|---|---|
| 13:54:19 | (nearest missed event) | 113s | -- | Too distant; genuine false positive |
| 13:56:11 | (nearest missed event) | 225s | -- | Too distant; genuine false positive |
| 13:49:57 | Truck missed at 13:50:06 | 9s | No (Bike vs. Truck) | Close in time, but different logged class argues against being the same vehicle |

Two of the three are unambiguous genuine false positives. The third is close
enough in time to warrant checking, but the class mismatch argues against
it being the same vehicle even at a wider tolerance. The manuscript
therefore does not smooth this into a uniform "all three are genuine false
positives" claim, since the data does not uniformly support that for all
three.

## Are the ten discrepancies clustered in time?

Binning all ten discrepancies (four missed, three misclassified, three
unmatched) into consecutive five-minute windows across the 30-minute
session:

| Window | Discrepancies |
|---|---|
| 0--5 min | 1 |
| 5--10 min | 0 |
| 10--15 min | 2 |
| 15--20 min | 3 |
| 20--25 min | 4 |
| 25--30 min | 0 |

Every discrepancy falls between 13:36:20 and 13:56:11 -- all ten in the
middle four of the six windows, with none in the first five minutes and
none in the final five. This is not consistent with a prior
characterization of this data as "isolated single events rather than in a
cluster." It is closer to a concentration in the middle of the session
that eases off by the end, not a rise sustained to the end, though ten
events are too few to distinguish a genuine mid-session effect (for
example, fatigue that eases as the session winds down) from chance
clustering with any confidence -- both readings remain plausible, and this
data does not adjudicate between them.

## Misclassification pattern

All three misclassifications involved a smaller, less visually distinct
class confused with a similarly sized but different one, consistent with
the literature's general finding that classification error is driven
primarily by difficulty recognizing a vehicle's length or form, not by
missing it altogether [6].
