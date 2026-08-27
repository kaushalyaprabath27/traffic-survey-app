# Data Schema

The JSON event object submitted by the client for each module, and the corresponding Google Sheet column layout it is written to (`backend/master_apps_script.js`, `handleSubmitBatch`). All fields are strings unless noted; times are `HH:MM:SS` in the surveyor's local device time (see the timing-resolution caveat in the manuscript's Limitations — there is no server-side clock reconciliation).

Every event also carries `action: "submit"` and `adminId` (the four-digit `ADM-XXXX` routing identifier); these route the request but are not written as data columns.

## main-road, roundabout, t-junction

Identical schema across all three modules.

| JSON field | Type | Sheet column | Notes |
|---|---|---|---|
| `name` | string | A | Surveyor name, as entered at setup |
| `location` | string | B | Free-text location label |
| `locationNumber` | string | C | Site/lane identifier |
| `date` | string (`YYYY-MM-DD`) | D | |
| `time` | string (`HH:MM:SS`) | E | Device local time |
| `direction` | string | F | e.g. "In"/"Out", or module-configured direction labels |
| `vehicleType` | string | G | One of: Bike, Tuk Tuk, Car, Bus, Van, Truck |

## pedestrian

| JSON field | Type | Sheet column | Notes |
|---|---|---|---|
| `name` | string | A | |
| `location` | string | B | |
| `locationNumber` | string | C | |
| `date` | string | D | |
| `startTime` | string | E | Interval start |
| `finishTime` | string | F | Interval end |
| `countIn` | integer (as string; defaults `"0"`) | G | |
| `countOut` | integer (as string; defaults `"0"`) | H | |

## bus-idling

| JSON field | Type | Sheet column | Notes |
|---|---|---|---|
| `name` | string | A | |
| `location` | string | B | |
| `gps` | string (`"lat,lon"`) | C | |
| `date` | string | D | |
| `route` | string | E | Bus route identifier |
| `startTime` | string | F | Idling interval start |
| `stopTime` | string | G | Idling interval end |
| `durationSeconds` | integer (as string; defaults `"0"`) | H | |
| `offCount` | integer (as string; defaults `"0"`) | I | Passengers alighting |
| `onCount` | integer (as string; defaults `"0"`) | J | Passengers boarding |

## institutional-idling

Also accepts the legacy `surveyType` value `"school-idling"`, normalized server-side to `"institutional-idling"` before routing.

| JSON field | Type | Sheet column | Notes |
|---|---|---|---|
| `name` | string | A | |
| `location` | string | B | |
| `locationNumber` | string | C | |
| `date` | string | D | |
| `time` | string | E | |
| `direction` | string | F | |
| `actionStatus` (falls back to `action` if absent) | string | G | e.g. "Stop", "Go" |
| `vehicleType` | string | H | |

## Unrecognized `surveyType`

Falls back to writing the entire item as a single JSON-stringified cell in column A of a sheet named after the unrecognized type. This is a defensive fallback, not an intended data path.

## Per-administrator spreadsheet structure

Each administrator's spreadsheet (created at signup — see `docs/DEPLOYMENT.md`) has six tabs, one per module, named exactly `main-road`, `roundabout`, `t-junction`, `pedestrian`, `bus-idling`, `institutional-idling`. Each tab's header row is set at creation time and matches the column layout above; `handleSubmitBatch` also creates a tab on the fly if a `surveyType` arrives that doesn't yet have one (e.g. from the legacy `school-idling` value before normalization added a tab lookup).

## Central registry schema

See `docs/DEPLOYMENT.md` step 3 for the `Admin_Registry` sheet's column layout and its disclosed password-storage limitation.
