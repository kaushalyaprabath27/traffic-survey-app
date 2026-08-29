# Data minimization proposal (B5) — declined by the author, not implemented

**Decision (29 Aug 2026): keep the free-text surveyor name field as-is.**
Author's stated reasoning: free-text names make it easy for an
administrator to recognize which surveyor is which; assigning and
distributing a separate identifier to each surveyor one by one is
operationally harder than the privacy gain is worth. Not implemented,
and not planned for this revision. Kept below for the record, in case
this is revisited later.

Proposes replacing the free-text surveyor `name` field, written into every
recorded event row, with a surveyor identifier decoupled from the
surveyor's real name — the mapping between the two held only in the
administrator's own records, not transmitted to or stored on the shared
backend as part of the event data. **Nothing in this document has been
applied.** No code, schema, or live Sheet has been changed.

## What exists today

Confirmed from `docs/DATA_SCHEMA.md` and `backend/master_apps_script.js`:
every module writes the surveyor's free-text `name` (entered once at
setup) into column A of every single recorded event row, for the
lifetime of that session. It is the first thing read off any row.

## Two designs considered

**Option A — admin-assigned code, still free-text entry.** The
administrator assigns each surveyor a short code (e.g. `S1`, `S2`)
through whatever channel they already use to distribute the Admin ID
PIN, and keeps the code-to-name mapping in their own separate record
(a personal note, a second private spreadsheet — outside this
application entirely). Surveyors type the code instead of their name
at setup. Minimal change: relabel the existing "Surveyor Name" field to
"Surveyor ID" in all six modules' setup screens, relabel column A's
header in `docs/DATA_SCHEMA.md` and each newly created sheet.

Weakness: it depends on the surveyor actually typing the assigned code
rather than their real name — the field is still free text, so nothing
in the software itself prevents a surveyor from typing their name out
of habit, especially since every module's setup screen has said
"Surveyor Name" until now. This does not fully close the channel it is
meant to close; it relies on the surveyor's compliance.

**Option B — app-generated identifier, no free-text name entry at all
(recommended).** On first use, each device generates a random
identifier (e.g. `SURV-` + 6 characters from the same safe alphabet as
the widened Admin ID, B1) and persists it in `localStorage`. It is
shown once, clearly, with an instruction to tell the administrator what
it is (the same distribution channel already used for the Admin ID
PIN). The setup screen no longer asks for a name at all — it displays
the device's own generated ID for the surveyor to confirm and share.
The administrator keeps a note of which generated ID corresponds to
which person, entirely outside this application.

Recommended because it removes the free-text name channel structurally,
not just by relabeling a field: there is no text box for a surveyor to
type a real name into in the first place, so no compliance-dependent
step is needed for the minimization to hold.

Both options are consistent with the existing consent-and-purpose
framing in `MethodsX_latex/SUBMISSION_NOTES.md` item 1 (Option B there,
if adopted, would no longer need to disclose the surveyor's name as
personal data recorded about them at all -- worth revisiting together).

## What would need to change (Option B), if approved

1. **`docs/DATA_SCHEMA.md`**: `name` (free-text) -> `surveyorId`
   (app-generated identifier) in every module's schema table; column A
   header relabeled from "Name" to "Surveyor ID" in the "Per-administrator
   spreadsheet structure" section.
2. **Every module's `index.html`** (six files): setup screen's
   "Surveyor Name" text input replaced with a read-only display of the
   device-generated identifier plus a short explanatory line.
3. **Every module's `app.js`** (six files): a `getOrCreateSurveyorId()`
   helper (generate once, persist in `localStorage`, reuse on every
   subsequent session from the same device) replacing the current
   direct read of the name input's value; the `name` field sent in
   `dataPayload` becomes `surveyorId`.
4. **`backend/master_apps_script.js`**: `handleSubmitBatch`'s column
   mapping updated to match; no change to the dedup or routing logic,
   which does not depend on this field.
5. **New sheets only.** Exactly like B1's Admin ID widening, this
   changes what gets written to *newly created* administrator
   spreadsheets going forward. It does not retroactively remove or
   alter the free-text names already written into existing live Sheets
   -- that is a separate question (see below), not something this
   schema change touches by itself, and not something to be run against
   live Sheets without an explicit decision from the author.

## What this does not decide

- Whether to adopt Option A, Option B, or neither.
- Whether existing live Sheets' already-recorded names should be
  redacted, left as-is, or something else -- a materially different
  question (retroactive data handling on live researcher data) from
  the schema question above, and not attempted here.
- Whether this interacts with the volunteer-consent decision in
  `SUBMISSION_NOTES.md` item 1 in a way that changes which option (or
  whether Option B or A) makes more sense to adopt now versus later.
