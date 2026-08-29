const urlParams = new URLSearchParams(window.location.search);
// Constants
const APPS_SCRIPT_URL = window.ENV_APPS_SCRIPT_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
// Client-generated event identifier for idempotent sync: lets the backend
// recognize and skip a retried event that already landed, instead of
// writing a duplicate row if an earlier ACK was lost after the write
// committed. crypto.randomUUID() needs a secure context (HTTPS/localhost);
// falls back to a Math.random()-based UUID v4 shape otherwise (weaker
// uniqueness guarantee, but this is a dedup key, not a security token).
function generateEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


setTimeout(() => {
    const urlToCheck = (typeof APPS_SCRIPT_URL !== 'undefined') ? APPS_SCRIPT_URL : ((typeof MASTER_APPS_SCRIPT_URL !== 'undefined') ? MASTER_APPS_SCRIPT_URL : '');
    if (urlToCheck === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        if(typeof showToast === 'function') showToast('WARNING: Apps Script URL not configured. Data will not sync.', 'error');
    }
}, 500);

const STORAGE_KEY = 'bus_idling_survey_queue';
const THEME_KEY = 'bus_idling_theme';

// App State
const appState = {
    adminId: '',
    surveyorName: '',
    location: '',
    gpsLat: null,
    gpsLng: null,
    isTimerRunning: false,
    startTime: null,
    endTime: null,
    durationSeconds: 0,
    offCount: 0,
    onCount: 0,
    timerInterval: null
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    setup: document.getElementById('setup-screen'),
    survey: document.getElementById('survey-screen')
};

// Navigation
document.getElementById('startAppBtn').addEventListener('click', () => switchScreen('setup'));

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Theme Handling
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
let isDarkMode = localStorage.getItem(THEME_KEY) !== 'light';

function initTheme() {
    if (!isDarkMode) {
        body.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
    initTheme();
});
initTheme();

// Setup Form & GPS
const setupForm = document.getElementById('setupForm');
const getGpsBtn = document.getElementById('getGpsBtn');
const gpsStatusText = document.getElementById('gpsStatusText');
const gpsStatusDot = document.querySelector('#gpsStatusBox .status-dot');
const beginSurveyBtn = document.getElementById('beginSurveyBtn');

getGpsBtn.addEventListener('click', () => {
    if ("geolocation" in navigator) {
        gpsStatusText.textContent = "Acquiring GPS...";
        gpsStatusDot.className = "status-dot warning";
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                appState.gpsLat = position.coords.latitude;
                appState.gpsLng = position.coords.longitude;
                gpsStatusText.textContent = `${appState.gpsLat.toFixed(5)}, ${appState.gpsLng.toFixed(5)}`;
                gpsStatusDot.className = "status-dot"; // green
                checkSetupForm();
            },
            (error) => {
                gpsStatusText.textContent = "Error: " + error.message;
                gpsStatusDot.className = "status-dot error";
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        gpsStatusText.textContent = "GPS not supported";
        gpsStatusDot.className = "status-dot error";
    }
});

function checkSetupForm() {
    const name = document.getElementById('surveyorName').value.trim();
    const loc = document.getElementById('locationSelect').value;
    if (name && loc) {
        beginSurveyBtn.disabled = false;
    } else {
        beginSurveyBtn.disabled = true;
    }
}

setupForm.addEventListener('input', checkSetupForm);
setupForm.addEventListener('change', checkSetupForm);

setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (beginSurveyBtn.disabled) return;
    
    appState.surveyorName = document.getElementById('surveyorName').value.trim();
    appState.location = document.getElementById('locationSelect').value;
    
    document.getElementById('displaySurveyor').textContent = appState.surveyorName;
    document.getElementById('displayLocation').textContent = appState.location;
    
    switchScreen('survey');
});

// Route Selection
const routeSelect = document.getElementById('routeSelect');
const customRouteGroup = document.getElementById('customRouteGroup');
const customRouteInput = document.getElementById('customRoute');

routeSelect.addEventListener('change', () => {
    if (routeSelect.value === 'Other') {
        customRouteGroup.classList.remove('hidden');
    } else {
        customRouteGroup.classList.add('hidden');
    }
});

// Timer Logic
const toggleTimerBtn = document.getElementById('toggleTimerBtn');
const timerDisplay = document.getElementById('timerDisplay');

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

toggleTimerBtn.addEventListener('click', () => {
    if (!appState.isTimerRunning) {
        // Start Timer
        appState.isTimerRunning = true;
        appState.startTime = new Date();
        appState.durationSeconds = 0;
        
        toggleTimerBtn.innerHTML = '<i class="fa-solid fa-stop"></i> STOP IDLING';
        toggleTimerBtn.classList.add('active');
        
        appState.timerInterval = setInterval(() => {
            const now = new Date();
            appState.durationSeconds = Math.floor((now - appState.startTime) / 1000);
            timerDisplay.textContent = formatTime(appState.durationSeconds);
        }, 1000);
        
    } else {
        // Stop Timer
        appState.isTimerRunning = false;
        appState.endTime = new Date();
        clearInterval(appState.timerInterval);
        
        toggleTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> START IDLING';
        toggleTimerBtn.classList.remove('active');
    }
});

// Counter Logic
document.querySelectorAll('.counter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const displayEl = document.getElementById(targetId);
        let val = targetId === 'offCount' ? appState.offCount : appState.onCount;
        
        if (btn.classList.contains('plus')) {
            val++;
        } else if (btn.classList.contains('minus')) {
            val = Math.max(0, val - 1);
        }
        
        if (targetId === 'offCount') {
            appState.offCount = val;
        } else {
            appState.onCount = val;
        }
        
        displayEl.textContent = val;
    });
});

// Data Save & Queue
const saveRecordBtn = document.getElementById('saveRecordBtn');

function getQueue() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveQueue(queue) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    updateQueueCounter();
}

function updateQueueCounter() {
    const queue = getQueue();
    const counter = document.getElementById('queueCounter');
    const countSpan = document.getElementById('queueCount');
    
    if (queue.length > 0) {
        counter.classList.remove('hidden');
        countSpan.textContent = queue.length;
    } else {
        counter.classList.add('hidden');
    }
}

function resetSurveyForm() {
    // Reset inputs
    routeSelect.value = "";
    customRouteGroup.classList.add('hidden');
    customRouteInput.value = "";
    
    // Reset timer
    if (appState.isTimerRunning) {
        clearInterval(appState.timerInterval);
        appState.isTimerRunning = false;
    }
    appState.startTime = null;
    appState.endTime = null;
    appState.durationSeconds = 0;
    timerDisplay.textContent = "00:00";
    toggleTimerBtn.innerHTML = '<i class="fa-solid fa-play"></i> START IDLING';
    toggleTimerBtn.classList.remove('active');
    
    // Reset counters
    appState.offCount = 0;
    appState.onCount = 0;
    document.getElementById('offCount').textContent = "0";
    document.getElementById('onCount').textContent = "0";
}

saveRecordBtn.addEventListener('click', () => {
    // Validation
    let finalRoute = routeSelect.value;
    if (!finalRoute) {
        showToast("Please select a bus route", "error");
        return;
    }
    if (finalRoute === 'Other') {
        finalRoute = customRouteInput.value.trim();
        if (!finalRoute) {
            showToast("Please enter the custom bus route", "error");
            return;
        }
    }
    
    if (appState.isTimerRunning) {
        showToast("Please stop the idling timer first", "error");
        return;
    }
    if (!appState.startTime || !appState.endTime) {
        showToast("Please record the idling time", "error");
        return;
    }

    const record = {
        action: 'submit',
        eventId: generateEventId(),
        adminId: appState.adminId,
        surveyType: 'bus-idling',
        name: appState.surveyorName,
        location: appState.location,
        gps: `${appState.gpsLat}, ${appState.gpsLng}`,
        date: appState.startTime.toLocaleDateString('en-GB'),
        route: finalRoute,
        startTime: appState.startTime.toLocaleTimeString('en-US', { hour12: false }),
        stopTime: appState.endTime.toLocaleTimeString('en-US', { hour12: false }),
        durationSeconds: appState.durationSeconds,
        offCount: appState.offCount,
        onCount: appState.onCount,
        timestamp: Date.now()
    };

    const queue = getQueue();
    queue.push(record);
    saveQueue(queue);
    
    showToast("Record saved locally!", "success");
    resetSurveyForm();
    processQueue();
});

// Network Syncing
const onlineStatus = document.getElementById('onlineStatus');

function updateOnlineStatus() {
    if (navigator.onLine) {
        onlineStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
        processQueue();
    } else {
        onlineStatus.innerHTML = '<span class="status-dot error"></span><span class="status-text">Offline</span>';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();



// Toast System
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Initial update
updateQueueCounter();

// --- Master App Integration ---
setTimeout(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('skipSetup') === 'true') {
        const urlAdmin = urlParams.get('admin') || '';
        const urlName = urlParams.get('name') || '';
        const urlLoc = urlParams.get('loc') || '';
        const urlAdminName = urlParams.get('adminName') || '';
        
        let state = { adminId: urlAdmin, adminName: urlAdminName, surveyorName: urlName, location: urlLoc, locationNumber: urlParams.get('locNum') || '' };
        
        try {
            // Also try localstorage as fallback
            const savedState = localStorage.getItem('master_appState');
            if (savedState) {
                const lsState = JSON.parse(savedState);
                if (lsState.surveyorName && !state.surveyorName) state.surveyorName = lsState.surveyorName;
                if (lsState.location && !state.location) state.location = lsState.location;
                if (lsState.adminName && !state.adminName) state.adminName = lsState.adminName;
                if (lsState.adminId && !state.adminId) state.adminId = lsState.adminId;
            }
        } catch(e) {}
        
        if (typeof appState !== 'undefined') {
            appState.adminId = state.adminId;
            appState.surveyorName = state.surveyorName;
            appState.location = state.location;
            appState.adminName = state.adminName;
            appState.locationNumber = state.locationNumber;
        }
        
        try {
           
           
           
            // Replace Num with Admin ID
           
           if(document.getElementById('displaySurveyor')) document.getElementById('displaySurveyor').textContent = state.surveyorName || '';
           if(document.getElementById('displayLocation')) document.getElementById('displayLocation').textContent = state.location || '';
        } catch(e) {}
        
        // Hide welcome/setup without transition
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        
        // ALWAYS Show survey
        const surveyScreen = document.getElementById('survey-screen') || document.getElementById('screen-survey');
        if(surveyScreen) {
            surveyScreen.classList.remove('hidden');
            surveyScreen.classList.add('active');
        }
    }
}, 100);












  // Apply dynamic configurations from Master App
  setTimeout(() => {
      try {
          const cfgStr = localStorage.getItem('survey_config');
          if (cfgStr) {
              const cfg = JSON.parse(cfgStr);
              if (cfg.busRoutes && cfg.busRoutes.trim() !== '') {
                  const select = document.getElementById('routeSelect');
                  if (select) {
                      select.innerHTML = '<option value="" disabled selected>Select Bus Route...</option>';
                      cfg.busRoutes.split(',').forEach(route => {
                          const opt = document.createElement('option');
                          opt.value = route.trim();
                          opt.textContent = route.trim();
                          select.appendChild(opt);
                      });
                  }
              }
          }
      } catch(e) {}
  }, 100);


// --- BATCHING, SYNC & NEW FEATURES LOGIC ---
let sessionCount = 0;
let isSyncing = false;

const gradients = [
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #8b5cf6, #5b21b6)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #ec4899, #be185d)'
];

function updateSessionCounter(amount) {
    sessionCount += amount;
    if (sessionCount < 0) sessionCount = 0;
    const counterVal = document.getElementById('counter-val');
    if (counterVal) counterVal.innerText = sessionCount;
    if (amount > 0 && sessionCount > 0 && sessionCount % 50 === 0) {
        triggerMilestoneAnimation(sessionCount);
    }
}

function triggerMilestoneAnimation(number) {
    const milestoneBus = document.getElementById('milestoneBus');
    const milestoneText = document.getElementById('milestoneText');
    if (!milestoneBus || !milestoneText) return;
    milestoneText.innerText = number + "!";
    milestoneBus.style.background = gradients[Math.floor(Math.random() * gradients.length)];
    milestoneBus.classList.remove('animate-bus');
    void milestoneBus.offsetWidth; 
    milestoneBus.classList.add('animate-bus');
}

function undoLastAction() {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    if (queue.length > 0) {
        queue.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        
        let secretQueue = [];
        try { secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]'); } catch(e){}
        if(secretQueue.length > 0) {
            secretQueue.pop();
            localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));
        }

        updateSessionCounter(-1);
        if(typeof showToast === 'function') showToast('Last entry removed!', 'success');
        updateSyncStatus();
    } else {
        if(typeof showToast === 'function') showToast('Nothing to undo (or already synced)', 'error');
    }
}

function queueDataLocally(data) {
    if (navigator.vibrate) { navigator.vibrate(0); setTimeout(() => navigator.vibrate(40), 10); }

    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    queue.push(data);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
        handleStorageFull(data, e);
        return;
    }

    let secretQueue = [];
    try { secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]'); } catch(e){}
    secretQueue.push(data);
    try {
        localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));
    } catch (e) {
        handleStorageFull(data, e);
        return;
    }

    updateSessionCounter(1);
    if(typeof showToast === 'function') showToast('Saved locally', 'success');
    updateSyncStatus();
}

// B2 fix (MethodsX revision r2): see main-road/app.js for the full
// explanation -- this duplicated function had the same uncaught-throw
// gap, confirmed the same way (analysis/quota_exceeded_probe.py).
function handleStorageFull(data, err) {
    console.error('localStorage full, event NOT saved:', err, data);
    if (typeof showToast === 'function') showToast('STORAGE FULL — this entry was NOT saved!', 'error');
    showPersistentStorageWarning();
    if (navigator.onLine && typeof syncOfflineQueue === 'function') syncOfflineQueue();
}

let _storageWarningEl = null;
function showPersistentStorageWarning() {
    if (_storageWarningEl && document.body.contains(_storageWarningEl)) return;
    _storageWarningEl = document.createElement('div');
    _storageWarningEl.setAttribute('role', 'alert');
    _storageWarningEl.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;padding:12px 16px;font-weight:bold;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
    _storageWarningEl.innerHTML = '⚠️ DEVICE STORAGE FULL — new taps are NOT being saved. Sync now or free up space. <button id="storage-warning-dismiss" style="margin-left:12px;background:#fff;color:#b91c1c;border:none;border-radius:4px;padding:4px 10px;font-weight:bold;cursor:pointer;">Dismiss</button>';
    document.body.prepend(_storageWarningEl);
    document.getElementById('storage-warning-dismiss').addEventListener('click', () => {
        if (_storageWarningEl && document.body.contains(_storageWarningEl)) {
            document.body.removeChild(_storageWarningEl);
        }
        _storageWarningEl = null;
    });
}

function syncOfflineQueue() {
    if (isSyncing || !navigator.onLine) return;
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    if (queue.length === 0) return;
    
    const batch = queue.slice(0, 50);
    isSyncing = true;
    if(typeof showToast === 'function') showToast('Syncing batch...', 'success');

    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        setTimeout(() => {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            isSyncing = false;
            if(typeof showToast === 'function') showToast('Mock sync complete', 'success');
            updateSyncStatus();
        }, 1000);
        return;
    }

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'submit_batch', payload: batch }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(response => {
        if (!response.ok) throw new Error('Network error');
        return response.json();
    })
    .then(result => {
        if (result.status === 'success') {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            if(typeof showToast === 'function') showToast('Cloud Sync: ' + batch.length + ' records saved!', 'success');
        }
    })
    .catch(err => console.error('Sync failed:', err))
    .finally(() => {
        isSyncing = false;
        updateSyncStatus();
    });
}

function updateSyncStatus() {
    appState.isOnline = navigator.onLine;
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    const syncStatusElement = document.getElementById('sync-status');
    if (!syncStatusElement) return;

    if (appState.isOnline) {
        if (queue.length > 0) {
            syncStatusElement.className = 'sync-status online';
            syncStatusElement.innerHTML = '<i class="fa-solid fa-wifi"></i> Online (' + queue.length + ' pending)';
        } else {
            syncStatusElement.className = 'sync-status online';
            syncStatusElement.innerHTML = '<i class="fa-solid fa-wifi"></i> Online (Synced)';
        }
    } else {
        syncStatusElement.className = 'sync-status offline';
        syncStatusElement.innerHTML = '<i class="fa-solid fa-plane"></i> Offline (' + queue.length + ' pending)';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let headerClicks = 0;
    const headerTitle = document.querySelector('#setup-screen h2');
    if(headerTitle) {
        headerTitle.addEventListener('click', () => {
            headerClicks++;
            if(headerClicks === 5) {
                headerClicks = 0;
                let secretData = localStorage.getItem('traffic_survey_secret_backup');
                if(!secretData) { alert('No backup data found.'); return; }
                let blob = new Blob([secretData], {type: 'application/json'});
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = 'traffic_survey_secret_backup.json';
                a.click();
            }
        });
    }
});



// --- TRANSPARENT LOCAL BACKUP EXPORT ---
function exportLocalBackup() {
    let secretData = localStorage.getItem('traffic_survey_secret_backup');
    if (!secretData) {
        secretData = (typeof STORAGE_KEY !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
    }
    if (!secretData || secretData === '[]') {
        if (typeof showToast === 'function') showToast('No local backup data found on this device yet.', 'error');
        else alert('No local backup data found on this device yet.');
        return;
    }
    try {
        let blob = new Blob([secretData], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `traffic_survey_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('Local backup file (.json) exported successfully!', 'success');
    } catch(e) {
        alert('Failed to export backup: ' + e.message);
    }
}
