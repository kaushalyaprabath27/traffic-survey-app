const urlParams = new URLSearchParams(window.location.search);
// Constants
const APPS_SCRIPT_URL = window.ENV_APPS_SCRIPT_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const STORAGE_KEY = 'traffic_survey_roundabout_queue';

// App State
const appState = {
    adminId: '',
    surveyorName: '',
    location: '',
    locationNumber: '',
    isOnline: navigator.onLine,
    offlineQueue: []
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    setup: document.getElementById('setup-screen'),
    survey: document.getElementById('survey-screen')
};

const setupForm = document.getElementById('setup-form');
const btnShareLocation = document.getElementById('btn-share-location');
const locationInput = document.getElementById('location-input');
const locationStatus = document.getElementById('location-status');
const syncStatusElement = document.getElementById('sync-status');
const vehicleButtons = document.querySelectorAll('.vehicle-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// Initialize
function init() {
    setInterval(syncOfflineQueue, 15000);

    loadOfflineQueue();
    updateSyncStatus();
    setupEventListeners();
    initTheme();
}

function initTheme() {
    const savedTheme = localStorage.getItem('roundabout_theme');
    const icon = themeToggleBtn.querySelector('i');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        icon.classList.replace('fa-moon', 'fa-sun');
    }
}

// Event Listeners
function setupEventListeners() {
    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        const icon = themeToggleBtn.querySelector('i');
        
        if (isLight) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('roundabout_theme', 'light');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('roundabout_theme', 'dark');
        }
    });

    // Screen Transitions
    document.getElementById('btn-next').addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => console.log(err));
        }
        switchScreen('welcome', 'setup');
    });

    // Geolocation
    btnShareLocation.addEventListener('click', getLocation);

    // Form Submit
    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        appState.surveyorName = document.getElementById('surveyor-name').value;
        appState.location = locationInput.value;
        appState.locationNumber = document.getElementById('location-number').value;

        // Update Survey UI info
        document.querySelector('#info-name span').textContent = appState.surveyorName;
        document.querySelector('#info-loc span').textContent = appState.location;
        document.querySelector('#info-num span').textContent = appState.locationNumber;

        switchScreen('setup', 'survey');
        showToast('Survey Started', 'success');
    });

    // Vehicle Button Clicks
    vehicleButtons.forEach(btn => {
        btn.addEventListener('click', handleVehicleClick);
    });

    // Network Status
    window.addEventListener('online', () => {
        appState.isOnline = true;
        updateSyncStatus();
        processQueue();
    });
    
    window.addEventListener('offline', () => {
        appState.isOnline = false;
        updateSyncStatus();
    });
}

// Core Functions
function switchScreen(hideId, showId) {
    screens[hideId].classList.remove('active');
    screens[hideId].classList.add('hidden');
    
    screens[showId].classList.remove('hidden');
    // slight delay to allow display to set before opacity transition
    setTimeout(() => {
        screens[showId].classList.add('active');
    }, 50);
}

function getLocation() {
    if (!navigator.geolocation) {
        locationStatus.textContent = "Geolocation is not supported by your browser";
        locationInput.removeAttribute('readonly');
        return;
    }

    btnShareLocation.disabled = true;
    locationStatus.textContent = "Fetching GPS...";
    locationStatus.style.color = "var(--text-secondary)";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            locationInput.value = `${lat}, ${lng}`;
            locationStatus.textContent = "Location acquired";
            locationStatus.style.color = "var(--success)";
            btnShareLocation.disabled = false;
        },
        (error) => {
            console.error(error);
            locationStatus.textContent = "Unable to retrieve location. Please type it.";
            locationStatus.style.color = "var(--error)";
            locationInput.removeAttribute('readonly');
            btnShareLocation.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function handleVehicleClick(e) {
    const btn = e.currentTarget;
    const vehicleType = btn.getAttribute('data-type');
    const direction = btn.getAttribute('data-dir');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

    const record = {
        action: 'submit',
        adminId: appState.adminId,
        surveyType: 'roundabout',
        name: appState.surveyorName,
        location: appState.location,
        locationNumber: appState.locationNumber,
        date: dateStr,
        time: timeStr,
        direction: direction,
        vehicleType: vehicleType,
        timestamp: now.getTime()
    };

    queueDataLocally(record);
    
    // Quick haptic feedback if supported
    
}





// Queue Management








function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (container.contains(toast)) {
            container.removeChild(toast);
        }
    }, 3000);
}

// Start
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
              const d1Name = cfg.rtD1 || 'Direction 1';
              const d2Name = cfg.rtD2 || 'Direction 2';
              
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
