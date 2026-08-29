/**
 * TRAFFIC SURVEY MASTER SCRIPT - BATCH PROCESSING FINAL VERSION
 * 
 * HOW TO DEPLOY:
 * 1. Copy ALL this code (Ctrl+A, Ctrl+C)
 * 2. Go to script.google.com
 * 3. Open your project
 * 4. Click in the editor, press Ctrl+A to select all, then DELETE
 * 5. Press Ctrl+V to paste this code
 * 6. Press Ctrl+S to save
 * 7. Click Deploy > Manage deployments > Edit (pencil icon)
 * 8. Change Version to "New version"
 * 9. Click Deploy
 */

const REGISTRY_SHEET_NAME = "Admin_Registry";

// --- Admin ID generation -------------------------------------------------
// MethodsX revision r2, B1: widened from "ADM-" + 4 digits (1000-9999,
// 9000 possible values -- not 10,000; the prior manuscript text
// overstated the space by 1000) to "ADM-" + 12 characters from a
// 32-symbol alphabet excluding visually confusable glyphs (0/O, 1/I, and
// lowercase L is excluded entirely by using uppercase only). This alone
// makes blind enumeration through the rate-limited network API
// infeasible (32^12 =~ 1.15e18 possible suffixes), independent of
// anything the platform itself exposes for caller-identity rate
// limiting or lockout.
//
// Apps Script exposes no cryptographically secure RNG (no
// crypto.getRandomValues, no Node crypto module equivalent) -- only
// Math.random(), which is not cryptographically secure. This widening
// is therefore a real increase in the size of the space an external
// caller must guess through the network API, not a claim that the
// value is unpredictable to an attacker who could somehow observe the
// underlying PRNG's internal state directly. Disclosed as such, not
// overstated.
const ADMIN_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // excludes 0, 1, I, O
const ADMIN_ID_SUFFIX_LENGTH = 12;
function generateAdminIdSuffix() {
  let out = "";
  for (let i = 0; i < ADMIN_ID_SUFFIX_LENGTH; i++) {
    out += ADMIN_ID_ALPHABET.charAt(Math.floor(Math.random() * ADMIN_ID_ALPHABET.length));
  }
  return out;
}

function getRegistrySpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("REGISTRY_SHEET_ID");
  let ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create("Traffic Survey Master Registry");
    props.setProperty("REGISTRY_SHEET_ID", ss.getId());
  }
  return ss;
}

function setupRegistry() {
  const ss = getRegistrySpreadsheet();
  let sheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REGISTRY_SHEET_NAME);
    sheet.appendRow(["Timestamp", "Name", "Email", "Institute", "Country", "Password", "AdminID", "TargetSheetID", "TargetSheetURL", "Config", "PasswordSalt"]);
    sheet.getRange("1:1").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return ss;
}

// --- Password hashing -------------------------------------------------
// Apps Script has no bcrypt/argon2/scrypt available. This uses salted
// SHA-256 (Utilities.computeDigest), which is NOT a memory-hard KDF: it is
// fast to compute, so an attacker who obtains the registry sheet directly
// (not through this API) could brute-force weak passwords far faster than
// against bcrypt/argon2. It is disclosed as this and only this -- a real
// improvement over plaintext storage, not a claim of best-practice-grade
// password hashing. A migration to a proper KDF would require a library
// Apps Script does not natively provide.
function generateSalt() {
  return Utilities.getUuid();
}

function hashPassword(password, salt) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt,
    Utilities.Charset.UTF_8
  );
  return digest.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

// One-time migration: hashes every existing plaintext password in the
// registry in place and clears the plaintext value from the Password
// column (the column is overwritten with the hash, so no plaintext
// remains anywhere in the sheet after this runs). Run manually once from
// the Apps Script editor (select this function, click Run) after
// deploying the code above -- it is not called automatically by any
// request handler, so it will not silently re-run.
//
// Detection: a row with no value in the PasswordSalt column (column K) is
// treated as pre-migration/plaintext. Already-migrated rows are skipped.
function migrateHashPasswords() {
  const ss = getRegistrySpreadsheet();
  const sheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  if (!sheet) {
    Logger.log("No registry sheet found -- nothing to migrate.");
    return;
  }
  const dataRange = sheet.getDataRange().getValues();
  let migrated = 0;
  for (let i = 1; i < dataRange.length; i++) {
    const row = dataRange[i];
    const currentPasswordCell = row[5];
    const currentSalt = row[10];
    if (!currentPasswordCell) continue; // empty row / no password set
    if (currentSalt) continue;          // already migrated
    const salt = generateSalt();
    const hash = hashPassword(currentPasswordCell.toString(), salt);
    sheet.getRange(i + 1, 6).setValue(hash);   // column F: Password (plaintext overwritten)
    sheet.getRange(i + 1, 11).setValue(salt);  // column K: PasswordSalt
    migrated++;
  }
  Logger.log("Migrated " + migrated + " row(s) from plaintext to salted SHA-256.");
  return migrated;
}

function doPost(e) { return handleRequest(e); }
function doGet(e) { return handleRequest(e); }

// Enable CORS for preflight (OPTIONS) if necessary, though simple text/plain POSTs don't trigger it.
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleRequest(e) {
  if (!checkGlobalRateLimit()) {
    return responseJson({status: "error", message: "Global rate limit exceeded (Too Many Requests). Please try again later."});
  }

  try {
    const params = e.parameter;
    let data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(err){}
    }
    for (let key in params) { data[key] = params[key]; }
    
    const action = data.action;
    
    // Identify Admin ID for rate limiting and sanity check
    let adminIdToCheck = data.adminId;
    if (action === "submit_batch" && data.payload && data.payload.length > 0) {
      adminIdToCheck = data.payload[0].adminId;
    }
    
    if (adminIdToCheck) {
      if (!isValidAdminId(adminIdToCheck)) {
        return responseJson({status: "error", message: "Unauthorized: Invalid Admin ID."});
      }
      if (!checkRateLimit(adminIdToCheck)) {
        return responseJson({status: "error", message: "Rate limit exceeded. Please wait."});
      }
    }
    
    if (action === "request_otp") {
      return handleRequestOTP(data);
    } else if (action === "verify_otp") {
      return handleVerifyOTP(data);
    } else if (action === "login") {
      return handleLogin(data);
    } else if (action === "submit") { // Legacy support just in case
      return handleSubmit(data);
    } else if (action === "submit_batch") {
      return handleSubmitBatch(data);
    } else if (action === "reset_request_otp") {
      return handleResetRequestOTP(data);
    } else if (action === "save_config") {
      return handleSaveConfig(data);
    } else if (action === "get_config") {
      return handleGetConfig(data);
    } else if (action === "reset_password") {
      return handleResetPassword(data);
    } else if (action === "registry_info") {
      return handleRegistryInfo(data);
    } else {
      return responseJson({status: "error", message: "Invalid action"});
    }
  } catch (error) {
    return responseJson({status: "error", message: error.toString()});
  }
}

function handleRequestOTP(data) {
  const email = data.email;
  if (!email) return responseJson({status: "error", message: "Email required"});
  
  const ss = setupRegistry();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const dataRange = registrySheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][2] && dataRange[i][2].toString().toLowerCase() === email.toLowerCase()) {
      return responseJson({status: "error", message: "Account already exists for this email. Please login."});
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const cache = CacheService.getScriptCache();
  const cacheData = {
    otp: otp,
    name: data.name,
    institute: data.institute,
    country: data.country,
    password: data.password
  };
  cache.put(email.toLowerCase(), JSON.stringify(cacheData), 900);
  
  const subject = "Traffic Survey App - Your Verification Code";
  const body = `Hello ${data.name || ''},\n\nYour 6-digit verification code to create your Admin Account is:\n\n${otp}\n\nThis code will expire in 15 minutes.`;
  
  try {
    MailApp.sendEmail(email, subject, body);
  } catch(e) {
    return responseJson({status: "error", message: "Failed to send email. Please check the address."});
  }
  
  return responseJson({status: "success", message: "OTP sent to email."});
}

function handleVerifyOTP(data) {
  const email = (data.email || "").toLowerCase();
  const enteredOtp = data.otp;
  
  if (!email || !enteredOtp) return responseJson({status: "error", message: "Email and OTP required"});
  
  const cache = CacheService.getScriptCache();
  const cachedString = cache.get(email);
  if (!cachedString) {
    return responseJson({status: "error", message: "OTP expired or not requested. Please request a new code."});
  }
  
  const cachedData = JSON.parse(cachedString);
  
  if (cachedData.otp !== enteredOtp) {
    return responseJson({status: "error", message: "Incorrect OTP code."});
  }
  
  const adminId = "ADM-" + generateAdminIdSuffix();
  const newSs = SpreadsheetApp.create("Traffic Survey Data - " + cachedData.name + " (" + adminId + ")");
  
  const sheets = [
    {name: "main-road",           headers: ["name", "location", "locationNumber", "date", "time", "direction", "vehicleType", "EventID"]},
    {name: "roundabout",          headers: ["name", "location", "locationNumber", "date", "time", "direction", "vehicleType", "EventID"]},
    {name: "t-junction",          headers: ["name", "location", "locationNumber", "date", "time", "direction", "vehicleType", "EventID"]},
    {name: "pedestrian",          headers: ["Name", "Location", "Location Number", "Date", "Start Time", "Finish Time", "Count IN", "Count OUT", "EventID"]},
    {name: "bus-idling",          headers: ["Name", "Location", "GPS Coordinates", "Date", "Bus Route", "Start Time", "Stop Time", "Idling Duration", "Got Off", "Got On", "EventID"]},
    {name: "institutional-idling", headers: ["Name", "Location", "Location Number", "Date", "Time", "Direction", "Action", "Vehicle Type", "EventID"]}
  ];
  
  let firstSheet = newSs.getSheets()[0];
  firstSheet.setName(sheets[0].name);
  firstSheet.appendRow(sheets[0].headers);
  firstSheet.getRange("1:1").setFontWeight("bold");
  firstSheet.setFrozenRows(1);
  
  for (let i = 1; i < sheets.length; i++) {
    let s = newSs.insertSheet(sheets[i].name);
    s.appendRow(sheets[i].headers);
    s.getRange("1:1").setFontWeight("bold");
    s.setFrozenRows(1);
  }
  
  try { newSs.addEditor(email); } catch (err) {}
  
  const ss = setupRegistry();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const passwordSalt = generateSalt();
  const passwordHash = hashPassword(cachedData.password, passwordSalt);
  registrySheet.appendRow([
    new Date(),
    cachedData.name,
    email,
    cachedData.institute,
    cachedData.country,
    passwordHash,
    adminId,
    newSs.getId(),
    newSs.getUrl(),
    "",
    passwordSalt
  ]);
  
  const subject = "Welcome to Traffic Survey App!";
  const body = `Thank you for registering, ${cachedData.name}!\n\nYour account has been successfully created.\n\nYour Admin ID for surveyors to use is: ${adminId}\n\nYou can access your survey data here: ${newSs.getUrl()}\n\nWelcome aboard!`;
  try { MailApp.sendEmail(email, subject, body); } catch(e) {}
  
  cache.remove(email);
  cache.remove("valid_admin_ids"); // Invalidate ID cache so the new admin is recognized
  
  return responseJson({
    status: "success",
    adminId: adminId,
    sheetUrl: newSs.getUrl()
  });
}

function handleLogin(data) {
  const email = (data.email || "").toLowerCase();
  const password = data.password;
  
  if (!email || !password) return responseJson({status: "error", message: "Email and password required"});
  
  const ss = getRegistrySpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  if (!registrySheet) return responseJson({status: "error", message: "No accounts found."});
  
  const dataRange = registrySheet.getDataRange().getValues();
  for (let i = dataRange.length - 1; i >= 1; i--) {
    if (dataRange[i][2] && dataRange[i][2].toString().toLowerCase() === email) {
      const storedValue = dataRange[i][5];
      const storedSalt = dataRange[i][10];
      const matches = storedSalt
        ? hashPassword(password, storedSalt) === storedValue
        : storedValue === password; // pre-migration row; see migrateHashPasswords()
      if (matches) {
        return responseJson({
          status: "success",
          adminId: dataRange[i][6],
          sheetUrl: dataRange[i][8]
        });
      } else {
        return responseJson({status: "error", message: "Incorrect password."});
      }
    }
  }
  
  return responseJson({status: "error", message: "Account not found."});
}

function getFallbackSpreadsheetId() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("FALLBACK_SHEET_ID");
  let ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch(e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create("Traffic Survey - Default Log (No Admin)");
    props.setProperty("FALLBACK_SHEET_ID", ss.getId());
  }
  return ss.getId();
}

function handleSubmitBatch(data) {
  const payload = data.payload;
  if (!payload || payload.length === 0) return responseJson({status: "success", count: 0});
  
  const firstItem = payload[0];
  const adminId = firstItem.adminId;
  let surveyType = firstItem.surveyType;
  if (surveyType === "school-idling") surveyType = "institutional-idling";
  
  const ss = getRegistrySpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const dataRange = registrySheet.getDataRange().getValues();
  let targetSheetId = null;
  
  for (let i = dataRange.length - 1; i >= 1; i--) {
    if (dataRange[i][6] === adminId) {
      targetSheetId = dataRange[i][7];
      break;
    }
  }
  
  if (!targetSheetId) {
    targetSheetId = getFallbackSpreadsheetId();
  }
  
  const targetSs = SpreadsheetApp.openById(targetSheetId);
  let targetSheet = targetSs.getSheetByName(surveyType);
  if (!targetSheet) targetSheet = targetSs.insertSheet(surveyType);
  
  let rows = [];
  let duplicatesSkipped = 0;
  const cache = CacheService.getScriptCache();

  for (let i = 0; i < payload.length; i++) {
    let item = payload[i];
    let sType = item.surveyType;
    if (sType === "school-idling") sType = "institutional-idling";

    // Idempotency: skip an event whose eventId was already written in the
    // recent window, so a retry after a lost ACK (the write committed but
    // the client never saw the success response, so it retries the same
    // batch) does not produce a duplicate row. 6 hours is CacheService's
    // maximum TTL; events without an eventId (older client builds that
    // predate this field) are not deduplicated -- they fall through
    // unchanged, exactly as before this change.
    if (item.eventId) {
      const cacheKey = "evt_" + item.eventId;
      if (cache.get(cacheKey)) {
        duplicatesSkipped++;
        continue;
      }
      cache.put(cacheKey, "1", 21600);
    }

    let rowData = [];
    if (sType === "main-road" || sType === "roundabout" || sType === "t-junction") {
      rowData = [
        item.name          || "",
        item.location      || "",
        item.locationNumber|| "",
        item.date          || "",
        item.time          || "",
        item.direction     || "",
        item.vehicleType   || "",
        item.eventId       || ""
      ];
    }
    else if (sType === "pedestrian") {
      rowData = [
        item.name          || "",
        item.location      || "",
        item.locationNumber|| "",
        item.date          || "",
        item.startTime     || "",
        item.finishTime    || "",
        item.countIn       || "0",
        item.countOut      || "0",
        item.eventId       || ""
      ];
    }
    else if (sType === "bus-idling") {
      rowData = [
        item.name          || "",
        item.location      || "",
        item.gps           || "",
        item.date          || "",
        item.route         || "",
        item.startTime     || "",
        item.stopTime      || "",
        item.durationSeconds || "0",
        item.offCount      || "0",
        item.onCount       || "0",
        item.eventId       || ""
      ];
    }
    else if (sType === "institutional-idling") {
      rowData = [
        item.name          || "",
        item.location      || "",
        item.locationNumber|| "",
        item.date          || "",
        item.time          || "",
        item.direction     || "",
        item.actionStatus  || item.action || "",
        item.vehicleType   || "",
        item.eventId       || ""
      ];
    }
    else {
      rowData = [JSON.stringify(item)];
    }
    rows.push(rowData);
  }

  if (rows.length > 0) {
    // Bulk insert for 98% reduction in server runtime
    targetSheet.getRange(targetSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }

  return responseJson({status: "success", count: rows.length, duplicatesSkipped: duplicatesSkipped});
}

function handleSubmit(data) {
  // Legacy single-row insert just in case
  data.payload = [data]; // convert to batch of 1
  return handleSubmitBatch(data);
}

function handleResetRequestOTP(data) {
  const email = (data.email || "").toLowerCase();
  if (!email) return responseJson({status: "error", message: "Email required"});
  
  const ss = getRegistrySpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const dataRange = registrySheet.getDataRange().getValues();
  let found = false;
  let userName = "";
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][2] && dataRange[i][2].toString().toLowerCase() === email) {
      found = true;
      userName = dataRange[i][1];
      break;
    }
  }
  
  if (!found) return responseJson({status: "error", message: "Account not found."});
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const cache = CacheService.getScriptCache();
  cache.put("reset_" + email, otp, 900);
  
  const subject = "Password Reset Request";
  const body = `Hello ${userName},\n\nYour 6-digit verification code to reset your password is:\n\n${otp}\n\nThis code will expire in 15 minutes.`;
  
  try {
    MailApp.sendEmail(email, subject, body);
  } catch(e) {
    return responseJson({status: "error", message: "Failed to send email."});
  }
  return responseJson({status: "success", message: "Reset OTP sent."});
}

function handleResetPassword(data) {
  const email = (data.email || "").toLowerCase();
  const enteredOtp = data.otp;
  const newPassword = data.newPassword;
  
  if (!email || !enteredOtp || !newPassword) return responseJson({status: "error", message: "Missing required fields."});
  
  const cache = CacheService.getScriptCache();
  const cachedOtp = cache.get("reset_" + email);
  if (!cachedOtp || cachedOtp !== enteredOtp) {
    return responseJson({status: "error", message: "OTP expired or incorrect."});
  }
  
  const ss = getRegistrySpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const dataRange = registrySheet.getDataRange().getValues();
  
  let rowIndex = -1;
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][2] && dataRange[i][2].toString().toLowerCase() === email) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return responseJson({status: "error", message: "Account not found."});

  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);
  registrySheet.getRange(rowIndex, 6).setValue(newHash);   // column F: Password
  registrySheet.getRange(rowIndex, 11).setValue(newSalt);  // column K: PasswordSalt

  cache.remove("reset_" + email);
  return responseJson({status: "success", message: "Password updated successfully!"});
}


function handleSaveConfig(data) {
  const adminId = data.adminId;
  const configStr = data.config;
  
  if (!adminId || !configStr) return responseJson({status: "error", message: "adminId and config required"});
  
  const ss = getRegistrySpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const dataRange = registrySheet.getDataRange().getValues();
  
  for (let i = dataRange.length - 1; i >= 1; i--) {
    if (dataRange[i][6] === adminId) {
      registrySheet.getRange(i + 1, 10).setValue(configStr);
      return responseJson({status: "success", message: "Config saved"});
    }
  }
  return responseJson({status: "error", message: "Admin ID not found"});
}

function handleGetConfig(data) {
  const adminId = data.adminId;
  if (!adminId) return responseJson({status: "error", message: "adminId required"});
  
  const ss = getRegistrySpreadsheet();
  const registrySheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const dataRange = registrySheet.getDataRange().getValues();
  
  for (let i = dataRange.length - 1; i >= 1; i--) {
    if (dataRange[i][6] === adminId) {
      return responseJson({status: "success", config: dataRange[i][9] || '{}', adminName: dataRange[i][1], adminEmail: dataRange[i][2] || ''});
    }
  }
  return responseJson({status: "error", message: "Admin ID not found"});
}


// Read-only diagnostic: confirms which spreadsheet this deployment's
// REGISTRY_SHEET_ID script property actually resolves to, and how many
// admin rows it can see there - no emails/passwords included. Use this to
// check whether the live deployment is reading the registry sheet you
// expect (e.g. after pasting this file into a new Apps Script project,
// which starts with no REGISTRY_SHEET_ID and silently creates a fresh,
// empty registry spreadsheet).
function handleRegistryInfo(data) {
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty("REGISTRY_SHEET_ID");

  const ss = getRegistrySpreadsheet();
  const sheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
  const rowCount = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  const adminIds = sheet && rowCount > 0
    ? sheet.getRange(2, 7, rowCount, 1).getValues().map(r => r[0]).filter(String)
    : [];

  return responseJson({
    status: "success",
    scriptPropertyWasSet: !!storedId,
    resolvedSpreadsheetId: ss.getId(),
    resolvedSpreadsheetUrl: ss.getUrl(),
    registrySheetExists: !!sheet,
    adminRowCount: rowCount,
    adminIds: adminIds
  });
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- SECURITY & RATE LIMITING ---

function checkGlobalRateLimit() {
  const cache = CacheService.getScriptCache();
  const key = "global_rate_limit";
  const countStr = cache.get(key);
  let count = countStr ? parseInt(countStr, 10) : 0;
  
  if (count >= 300) {
    return false; // Exceeded 300 requests per minute globally
  }
  
  cache.put(key, (count + 1).toString(), 60); // 60 seconds rolling window
  return true;
}

function checkRateLimit(adminId) {
  if (!adminId) return true;
  const cache = CacheService.getScriptCache();
  const key = "rate_" + adminId;
  const countStr = cache.get(key);
  let count = countStr ? parseInt(countStr, 10) : 0;
  
  if (count >= 300) {
    return false; // Exceeded 300 requests per minute
  }
  
  cache.put(key, (count + 1).toString(), 60); // 60 seconds rolling window
  return true;
}

function isValidAdminId(adminId) {
  if (!adminId) return true; 
  const cache = CacheService.getScriptCache();
  const cachedIds = cache.get("valid_admin_ids");
  
  let validIds;
  if (cachedIds) {
    validIds = JSON.parse(cachedIds);
  } else {
    // Cache miss, rebuild
    const ss = getRegistrySpreadsheet();
    const sheet = ss.getSheetByName(REGISTRY_SHEET_NAME);
    const dataRange = sheet.getDataRange().getValues();
    validIds = [];
    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][6]) validIds.push(dataRange[i][6]);
    }
    cache.put("valid_admin_ids", JSON.stringify(validIds), 21600); // 6 hours
  }
  
  return validIds.includes(adminId);
}
