# Admin ID migration proposal (B1) — approved, Option B; see execution status below

**Author approved Option B (coordinated hard cutover) on 29 Aug 2026.**
The 12 new IDs are generated (see "Execution" at the end of this file).
**What could not be done automatically: writing them to the live
registry and emailing each admin.** Neither is reachable through this
tool — explained below, not glossed over.

Original proposal follows unchanged.

This document proposes a strategy for migrating the 12 currently
registered `ADM-####` (4-digit) admin IDs to the new 12-character format
(`backend/master_apps_script.js`, `generateAdminIdSuffix`). **Nothing in
this document has been run against the live backend.** The code change
that widens ID generation for *new* signups going forward is already
made and committed; this document is only about what happens to the 12
IDs that already exist.

## Why this is the hard part

The 4-digit IDs are not just registry-sheet values. They are also:

- Typed in as PINs on every surveyor's phone for that administrator,
  potentially across multiple devices per admin.
- Not retrievable by this tool — there is no channel from the backend
  back to a surveyor's device to push a new value. Only the
  administrator (via email, per the registry) can be reached
  programmatically; surveyors can only be reached by the administrator
  telling them directly.
- In active use: a mid-session surveyor with the old ID cached would be
  affected by any change that invalidates it immediately.

Confirmed from `isValidAdminId`/`handleRequest`: an unrecognized admin
ID produces an explicit `"Unauthorized: Invalid Admin ID."` error
response, not a silent misroute or silent data loss. Whatever the
surveyor's app does with that error (nothing in the frontend code
currently surfaces it as a blocking, attention-getting message — this
is a related but separate gap, not investigated further here) is a
different question from whether the *backend* fails safely. It does.

## Three options considered

**Option A — dual-running compatibility window.** Generate a new
12-character ID for every existing admin, keep a mapping of
old-ID-to-new-ID in the registry, and accept either ID for a fixed
transition period (e.g. 30 days) before retiring the old ones. Lowest
disruption; but it keeps the guessable 4-digit space live and
functional for the entire transition window, which is exactly the
weakness being fixed. Not recommended as the primary strategy for that
reason, though it could be layered under Option B if a transition
window turns out to be needed in practice.

**Option B — coordinated hard cutover (recommended).** Rotate every
existing admin to a new 12-character ID in one pass, invalidate the old
IDs immediately, and email every admin their new ID from the registry's
own recorded email address (the same mechanism already used for
onboarding and password-reset emails). This is exactly the manual
process already carried out once, by hand, for `ADM-5505` -> `ADM-7734`
in Part 0 of this revision (see `REVISION_CHANGELOG.md`) — this option
is that same process, scripted and applied to the remaining 11 admins
at once, rather than repeated by hand one at a time.

Recommended because the admin population is small and fully known: the
live registry currently holds exactly 12 admins (confirmed via the
`registry_info` diagnostic), all with an email address on file. A
coordinated one-time cutover is tractable at this scale in a way it
would not be at hundreds of admins.

**Option C — new-admins-only, no migration.** Leave the widened
generator in place for future signups; do nothing for the 12 existing
admins. Rejected as insufficient on its own: it leaves every admin
registered before this change on the guessable 4-digit space
indefinitely, which is the actual population the reviewer's comment is
about. It would only be acceptable as a stopgap if Option B's
notification step turns out to be blocked for some reason (e.g. stale
email addresses).

## Proposed steps for Option B, if approved

1. **Dry run, read-only**: pull the current registry via
   `registry_info`, confirm all 12 admin emails are present and look
   plausible (not obviously bounced/placeholder addresses). Report
   before proceeding.
2. **Generate 12 new IDs** using the same `generateAdminIdSuffix()`
   logic already deployed, checked against each other and against the
   existing list for collisions (astronomically unlikely at 32^12, but
   checked anyway rather than assumed).
3. **Single registry write pass**: update the AdminID column (column G)
   for all 12 rows in one script run, not one-by-one by hand, to avoid
   the kind of manual error a 12-row hand-edit invites.
4. **Cache invalidation**: explicitly clear the `valid_admin_ids` cache
   key immediately after the write (the existing `handleVerifyOTP` flow
   already does this on new-admin creation; this migration path needs
   the same call added, since a direct sheet edit — like the manual
   `ADM-5505` rotation in Part 0 — does not clear it and leaves the old
   ID live for up to 6 hours otherwise).
5. **Notify every admin by email**, in the same pass, with their new ID
   and a short explanation of why it changed, mirroring the existing
   onboarding/welcome email's tone and content.
6. **Old IDs immediately invalid** — no compatibility window under this
   option. Any surveyor still using an old ID gets the existing
   `"Unauthorized: Invalid Admin ID."` response until their
   administrator gives them the new one.
7. **Confirm via `registry_info`** post-migration that all 12 IDs are
   now 12-character format and the old ones are gone, the same
   before/after check already used to confirm the single `ADM-5505`
   rotation.

## What this document does not decide

Whether to run this at all, and if so, when (e.g. announced in advance
vs. immediate) — that is explicitly the author's call, not something to
infer from the reviewer comment or execute automatically.

## Execution (29 Aug 2026) — what this tool could and could not do

**Generated:** 12 new IDs, one per currently-registered admin, using
Python's `secrets` module (a real CSPRNG — available here, unlike
inside Apps Script itself, where the deployed generator is stuck with
`Math.random()`; this one-time migration is not bound by that
limitation the way ongoing signups are). Checked for collisions among
themselves before use; none occurred (expected, at 32^12 possible
values).

| Old ID | New ID |
|---|---|
| `ADM-5990` | `ADM-[REDACTED-1]` |
| `ADM-6613` | `ADM-[REDACTED-2]` |
| `ADM-6339` | `ADM-[REDACTED-3]` |
| `ADM-9457` | `ADM-[REDACTED-4]` |
| `ADM-2178` | `ADM-[REDACTED-5]` |
| `ADM-9208` | `ADM-[REDACTED-6]` |
| `ADM-8277` | `ADM-[REDACTED-7]` |
| `ADM-1621` | `ADM-[REDACTED-8]` |
| `ADM-9666` | `ADM-[REDACTED-9]` |
| `ADM-6739` | `ADM-[REDACTED-10]` |
| `ADM-4202` | `ADM-[REDACTED-11]` |
| `ADM-7734` | `ADM-[REDACTED-12]` |

**Could not be done from here — two real capability gaps, not policy
choices:**

1. **Writing these to the live registry spreadsheet.** No deployed
   endpoint (`registry_info`, `save_config`, or any other current
   action) accepts an admin-ID update — checked the full action list
   in `handleRequest` directly, none exists. The only way this tool
   reached the registry at all (Part 0, `ADM-5505` -> `ADM-7734`) was
   a manual edit performed by the author, in the browser, in the sheet
   itself. The same applies here, at 12 rows instead of 1:
   1. Open the registry sheet (same link used in Part 0):
      `https://docs.google.com/spreadsheets/d/16_5Kku1TCYQ8fzB8ZbDYYCR7XfA_-VZlT6PhGl3Rnp8/edit`
   2. For each row, find the Old ID in column G and replace it with its
      New ID from the table above.
   3. The `valid_admin_ids` cache (6-hour TTL) will not reflect this
      until it expires or is cleared — same caveat as Part 0.
2. **Emailing each admin their new ID.** This tool cannot send email,
   and `registry_info` deliberately does not return admin email
   addresses (by design, per its own code comment — "no emails/
   passwords included"), so there isn't even a recipient list available
   from here to draft to. The registry sheet itself has each admin's
   email in column C, next to the ID you're changing in column G — the
   author is the only one positioned to match new ID to correct person
   and send it, while making the edit above.

A suggested notification text, for reuse across all 12:

> Your Admin ID has changed as part of a security update. Your surveyors
> will need this new ID instead of the old one: [NEW ID]. Please share
> it with them before your next session — the old ID will stop working
> once this update takes effect.

**Confirming the change worked** (once run): the same `registry_info`
check used in Part 0 —
```
curl.exe -sL "https://script.google.com/macros/s/AKfycbz4jYswPv7LSFSkSymoQ8tBt1ui6ngLTwh5EAKNVxu5Qf16-oGT8zf6nMkczo-o5hQC/exec?action=registry_info"
```
— should show all 12 new IDs from the table above and none of the old
ones.
