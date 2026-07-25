const urlParams = new URLSearchParams(window.location.search);
// Constants
const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
const STORAGE_KEY = 'traffic_survey_intersection_queue';

// App State
const appState = {
    adminId: '',
    surveyorName: '',
    location: '',
    locationNumber: '',
    isOnline: navigator.onLine
};

// DOM Elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    setup: document.getElementById('setup-screen'),
    survey: document.getElementById('survey-screen')
};

const setupForm = document.getElementById('setup-form');
const locationNumberSelect = document.getElementById('location-number');
const btnShareLocation = document.getElementById('btn-share-location');
const locationInput = document.getElementById('location-input');
const locationStatus = document.getElementById('location-status');
const syncStatusElement = document.getElementById('sync-status');
const vehicleButtons = document.querySelectorAll('.vehicle-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// Initialize App
function init() {
    setInterval(syncOfflineQueue, 15000);

    // Theme Initialization
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        if (document.body.classList.contains('light-theme')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });

    // Generate Location Numbers (1-40)
    for (let i = 1; i <= 40; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        locationNumberSelect.appendChild(option);
    }

    // Event Listeners
    document.getElementById('btn-next').addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log(e));
        }
        switchScreen('setup');
    });
    
    btnShareLocation.addEventListener('click', getGPSLocation);
    setupForm.addEventListener('submit', handleSetupSubmit);
    
    vehicleButtons.forEach(btn => {
        btn.addEventListener('click', handleVehicleClick);
    });

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
}

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
        setTimeout(() => screen.classList.add('hidden'), 400);
    });

    setTimeout(() => {
        screens[screenName].classList.remove('hidden');
        setTimeout(() => screens[screenName].classList.add('active'), 10);
    }, 400);
}

// Setup Form Handling
function getGPSLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported', 'error');
        locationInput.removeAttribute('readonly');
        locationInput.placeholder = "Enter manually";
        return;
    }

    locationStatus.textContent = "Locating...";
    btnShareLocation.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(5);
            const lng = position.coords.longitude.toFixed(5);
            locationInput.value = `${lat}, ${lng}`;
            locationStatus.textContent = "GPS locked";
            locationStatus.style.color = "var(--row1-color)";
            btnShareLocation.disabled = false;
        },
        (error) => {
            showToast('Failed to get GPS. Enter manually.', 'error');
            locationStatus.textContent = "";
            locationInput.removeAttribute('readonly');
            locationInput.placeholder = "Enter manually";
            btnShareLocation.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function handleSetupSubmit(e) {
    e.preventDefault();
    
    appState.surveyorName = document.getElementById('surveyor-name').value;
    appState.location = locationInput.value;
    appState.locationNumber = locationNumberSelect.value;

    document.querySelector('#info-name span').textContent = appState.surveyorName;
    document.querySelector('#info-loc span').textContent = appState.location;
    document.querySelector('#info-num span').textContent = appState.locationNumber;

    switchScreen('survey');
}

// Survey Logic
function handleVehicleClick(e) {
    const btn = e.currentTarget;
    const vehicleType = btn.dataset.type;
    const direction = btn.dataset.dir;

    btn.classList.add('clicked');
    setTimeout(() => btn.classList.remove('clicked'), 300);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); 
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

    const dataPayload = { action: 'submit',
        adminId: appState.adminId,
        surveyType: 't-junction',
        name: appState.surveyorName,
        location: appState.location,
        locationNumber: appState.locationNumber,
        date: dateStr,
        time: timeStr,
        direction: direction,
        vehicleType: vehicleType
    };

    saveData(dataPayload);
}

function saveData(data) {
    queueDataLocally(data);
}

// Network and Sync

// --- BATCHING, SYNC & NEW FEATURES LOGIC ---
let sessionCount = 0;
let isSyncing = false;

// Array of vibrant gradients for animation
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
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
    milestoneBus.style.background = randomGradient;

    milestoneBus.classList.remove('animate-bus');
    void milestoneBus.offsetWidth; 
    milestoneBus.classList.add('animate-bus');
}

function undoLastAction() {
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (queue.length > 0) {
        queue.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        
        // Remove from secret backup too
        let secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]');
        if(secretQueue.length > 0) {
            secretQueue.pop();
            localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));
        }

        updateSessionCounter(-1);
        showToast('Last entry removed!', 'success');
        updateNetworkStatus();
    } else {
        showToast('Nothing to undo (or already synced)', 'error');
    }
}

function queueDataLocally(data) {
    // 1. Haptic Feedback
    if (navigator.vibrate) { navigator.vibrate(0); setTimeout(() => navigator.vibrate(40), 10); }

    // 2. Add to Main Queue (for syncing)
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    queue.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

    // 3. Add to Secret Backup Queue (never deleted on sync)
    let secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]');
    secretQueue.push(data);
    localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));

    // 4. Update UI
    updateSessionCounter(1);
    showToast('Saved locally', 'success');
    updateNetworkStatus(); // to show pending count
}

function syncOfflineQueue() {
    if (isSyncing) return;
    if (!navigator.onLine) return;
    
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (queue.length === 0) return;
    
    // Batch up to 50 records
    const batch = queue.slice(0, 50);
    isSyncing = true;
    showToast('Syncing batch...', 'success');

    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        setTimeout(() => {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            isSyncing = false;
            showToast('Mock sync complete', 'success');
            updateNetworkStatus();
        }, 1000);
        return;
    }

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'submit_batch',
            payload: batch
        }),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8' // Avoids CORS preflight
        }
    })
    .then(response => {
        // If Google errors out (e.g. Quota Exceeded), it returns an error page WITHOUT CORS headers.
        // This will correctly throw a fetch TypeError and we won't delete the local queue!
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(result => {
        if (result.status === "success") {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            // Only slice off the ones we successfully sent
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            showToast('Cloud Sync: ' + batch.length + ' records saved!', 'success');
        }
    })
    .catch(err => {
        console.error("Sync failed, data safe in queue:", err);
    })
    .finally(() => {
        isSyncing = false;
        updateNetworkStatus();
    });
}

// Hidden feature: 5 clicks the App Header in setup to download backup
document.addEventListener('DOMContentLoaded', () => {
    let headerClicks = 0;
    const headerTitle = document.querySelector('#setup-screen h2');
    if(headerTitle) {
        headerTitle.addEventListener('click', () => {
            headerClicks++;
            if(headerClicks === 5) {
                headerClicks = 0;
                let secretData = localStorage.getItem('traffic_survey_secret_backup');
                if(!secretData) {
                    alert("No backup data found.");
                    return;
                }
                let blob = new Blob([secretData], {type: "application/json"});
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = "traffic_survey_secret_backup.json";
                a.click();
            }
        });
    }
});

// Update Network Status UI
function updateNetworkStatus() {
    appState.isOnline = navigator.onLine;
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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


// UI Utilities
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 300);
    }, 2000); // Shorter duration for high-volume clicks
}

document.addEventListener('DOMContentLoaded', init);

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
