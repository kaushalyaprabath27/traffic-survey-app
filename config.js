// Deployed Google Apps Script Web App URL (backend/master_apps_script.js).
// Read by app.js (root) and every module's own app.js as
// window.ENV_APPS_SCRIPT_URL. This file is normally .gitignore'd ("Local
// configuration") so a repo clone doesn't silently inherit someone else's
// deployment -- committed here specifically because the GitHub-connected
// Netlify deploy has no build step to inject an env var into a static file
// at runtime, so a real committed file is the only way for the deployed
// site to have this value at all. Not a secret: this exact URL is already
// visible to every surveyor's browser (Network tab / view-source) the
// moment they use the app, since it must be called directly from
// client-side JS with "Who has access: Anyone" -- committing it exposes
// nothing that isn't already public to any end user.
window.ENV_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4jYswPv7LSFSkSymoQ8tBt1ui6ngLTwh5EAKNVxu5Qf16-oGT8zf6nMkczo-o5hQC/exec';
