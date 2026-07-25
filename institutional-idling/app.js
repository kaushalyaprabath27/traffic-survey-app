const urlParams = new URLSearchParams(window.location.search);
// Constants
const APPS_SCRIPT_URL = window.ENV_APPS_SCRIPT_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

setTimeout(() => {
    const urlToCheck = (typeof APPS_SCRIPT_URL !== 'undefined') ? APPS_SCRIPT_URL : ((typeof MASTER_APPS_SCRIPT_URL !== 'undefined') ? MASTER_APPS_SCRIPT_URL : '');
    if (urlToCheck === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        if(typeof showToast === 'function') showToast('WARNING: Apps Script URL not configured. Data will not sync.', 'error');
    }
}, 500);

const STORAGE_KEY = 'school_traffic_survey_queue';
const THEME_KEY = 'school_traffic_survey_theme';

// App State
const appState = {
    adminId: '',
    surveyorName: '',
    location: '',
    locationNumber: '',
    isOnline: navigator.onLine,
    gpsCoords: 'Not recorded'
};

// DOM Elements
const screens = {
    welcome: document.getElementById('screen-welcome'),
    setup: document.getElementById('screen-setup'),
    survey: document.getElementById('screen-survey')
};

const networkDot = document.getElementById('network-dot');
const syncStatusElement = document.getElementById('sync-status');
const vehicleButtons = document.querySelectorAll('.vehicle-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// Initialize App
function init() {
    setInterval(syncOfflineQueue, 15000);

    loadTheme();
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Initial check for offline queue sync
    if (appState.isOnline) {
        processOfflineQueue();
    }
}

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const icon = themeToggleBtn.querySelector('i');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    const icon = themeToggleBtn.querySelector('i');
    
    if (isLight) {
        localStorage.setItem(THEME_KEY, 'light');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        localStorage.setItem(THEME_KEY, 'dark');
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
});

// Screen Navigation
function switchScreen(from, to) {
    screens[from].classList.remove('active');
    setTimeout(() => {
        screens[to].classList.add('active');
    }, 400); // Wait for fade out
}

// Welcome Screen
document.getElementById('btn-next').addEventListener('click', () => {
    // Request fullscreen & lock orientation when entering app
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    }
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => console.log(err));
    }
    switchScreen('welcome', 'setup');
});

// Setup Screen
const inputName = document.getElementById('surveyor-name');
const inputLoc = document.getElementById('location-name');
const inputLocNum = document.getElementById('location-number');
const btnStart = document.getElementById('btn-start');
const btnGps = document.getElementById('btn-gps');
const gpsStatus = document.getElementById('gps-status');

function checkSetupForm() {
    if (inputName.value.trim() && inputLoc.value.trim() && inputLocNum.value) {
        btnStart.classList.remove('btn-disabled');
    } else {
        btnStart.classList.add('btn-disabled');
    }
}

inputName.addEventListener('input', checkSetupForm);
inputLoc.addEventListener('input', checkSetupForm);
inputLocNum.addEventListener('change', checkSetupForm);

btnGps.addEventListener('click', () => {
    gpsStatus.classList.remove('hidden');
    gpsStatus.textContent = "Getting coordinates...";
    gpsStatus.className = "status-text mt-2 text-sm text-center text-accent";

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                appState.gpsCoords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                gpsStatus.textContent = `GPS Acquired: ${appState.gpsCoords}`;
                gpsStatus.className = "status-text mt-2 text-sm text-center" + (document.body.classList.contains('light-theme') ? " text-green-600" : " text-green-400");
                btnGps.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Location Saved';
            },
            (error) => {
                gpsStatus.textContent = "GPS Failed. Make sure location is turned on.";
                gpsStatus.className = "status-text mt-2 text-sm text-center" + (document.body.classList.contains('light-theme') ? " text-red-600" : " text-red-400");
                console.error("Error getting GPS:", error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        gpsStatus.textContent = "GPS is not supported by your browser.";
        gpsStatus.className = "status-text mt-2 text-sm text-center text-red-400";
    }
});

btnStart.addEventListener('click', () => {
    appState.surveyorName = inputName.value.trim();
    appState.location = inputLoc.value.trim();
    appState.locationNumber = inputLocNum.value;
    switchScreen('setup', 'survey');
});

// Survey Screen Logic
function getCurrentDateTime() {
    const now = new Date();
    // Format: YYYY-MM-DD
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // Format: HH:MM:SS
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return { date, time };
}

// Click Feedback Animation
const clickFeedback = document.getElementById('click-feedback');
function showClickFeedback(x, y) {
    clickFeedback.style.left = `${x}px`;
    clickFeedback.style.top = `${y}px`;
    clickFeedback.classList.remove('animate');
    void clickFeedback.offsetWidth; // Trigger reflow
    clickFeedback.classList.add('animate');
}

// Handle Vehicle Clicks
vehicleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Show animation
        const rect = btn.getBoundingClientRect();
        // Fallback to center of button if e.clientX is missing (e.g., keyboard trigger)
        const x = e.clientX || rect.left + rect.width / 2;
        const y = e.clientY || rect.top + rect.height / 2;
        showClickFeedback(x, y);

        // Gather Data
        const type = btn.getAttribute('data-type');
        const direction = btn.getAttribute('data-dir');
        const action = btn.getAttribute('data-action');
        const { date, time } = getCurrentDateTime();

        const dataRecord = {
            action: 'submit',
            surveyType: 'institutional-idling',
            adminId: appState.adminId,
            name: appState.surveyorName,
            location: appState.gpsCoords !== 'Not recorded' ? appState.gpsCoords : appState.location,
            locationNumber: appState.locationNumber,
            date: date,
            time: time,
            direction: direction,
            actionStatus: action, // Stop or Go
            vehicleType: type
        };

        if (appState.isOnline) {
            queueDataLocally(dataRecord);
        } else {
            saveToOfflineQueue(dataRecord);
        }
    });
});

// Network & Data Syncing


function getOfflineQueue() {
    const queueStr = localStorage.getItem(STORAGE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
}

function saveToOfflineQueue(record) {
    const queue = getOfflineQueue();
    queue.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    updateNetworkStatus(); // Update offline count in UI
}



function processOfflineQueue() {
    if (!appState.isOnline || APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return;

    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    networkDot.className = 'dot syncing';
    
    // Send all queued records sequentially
    const sendNext = (index) => {
        if (index >= queue.length) {
            // All done
            localStorage.removeItem(STORAGE_KEY);
            updateNetworkStatus();
            return;
        }

        const record = queue[index];
        fetch(APPS_SCRIPT_URL + '?' + new URLSearchParams(record).toString(), { mode: 'no-cors' })
        .then(() => {
            // update UI progress
            syncStatusElement.textContent = `Online (Syncing ${queue.length - index - 1}...)`;
            sendNext(index + 1);
        })
        .catch(() => {
            // Stop syncing if connection drops again, keep remaining items in queue
            const remaining = queue.slice(index);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
            updateNetworkStatus();
        });
    };

    sendNext(0);
}

// Start App
init();

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
           if(document.querySelector('#info-name span')) document.querySelector('#info-name span').textContent = state.surveyorName || '';
           if(document.querySelector('#info-loc span')) document.querySelector('#info-loc span').textContent = state.location || '';
           if(document.querySelector('#info-admin-name span')) document.querySelector('#info-admin-name span').textContent = state.adminName || '';
           if(document.querySelector('#info-num span')) document.querySelector('#info-num span').textContent = state.adminId || ''; // Replace Num with Admin ID
           
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
              const d1Name = cfg.iiD1 || 'Galle Direction';
              const d2Name = cfg.iiD2 || 'Juulgaha Direction';
              
              // Update panel headers
              const inPanelH2 = document.querySelector('.in-panel .panel-header h2');
              if (inPanelH2) inPanelH2.innerHTML = d1Name;
              
              const outPanelH2 = document.querySelector('.out-panel .panel-header h2');
              if (outPanelH2) outPanelH2.innerHTML = d2Name;
              
              // Update all buttons data-dir attributes
              document.querySelectorAll('.in-panel .vehicle-btn').forEach(btn => btn.setAttribute('data-dir', d1Name));
              document.querySelectorAll('.out-panel .vehicle-btn').forEach(btn => btn.setAttribute('data-dir', d2Name));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

    let secretQueue = [];
    try { secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]'); } catch(e){}
    secretQueue.push(data);
    localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));

    updateSessionCounter(1);
    if(typeof showToast === 'function') showToast('Saved locally', 'success');
    updateSyncStatus(); 
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
