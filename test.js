const document = {
    getElementById: (id) => { return { addEventListener: () => {}, value: '', style: {}, classList: { add: ()=>{}, remove: ()=>{} } }; },
    querySelectorAll: (q) => { return [{ addEventListener: () => {}, classList: { toggle: ()=>{} }, previousElementSibling: { type: '' } }]; },
    addEventListener: () => {},
    documentElement: { requestFullscreen: async () => {} },
    readyState: 'loading'
};
const window = { location: { search: '' }, addEventListener: ()=>{} };
const localStorage = { getItem: () => null, setItem: () => {} };
const navigator = { geolocation: { getCurrentPosition: () => {} } };
// Master App Setup Logic

const screens = {
    welcome: document.getElementById('welcome-screen'),
    setup: document.getElementById('setup-screen'),
    admin: document.getElementById('admin-screen')
};

const locationInput = document.getElementById('location-input');
const btnShareLocation = document.getElementById('btn-share-location');
const locationStatus = document.getElementById('location-status');
const setupForm = document.getElementById('setup-form');
const surveyTypeSelect = document.getElementById('survey-type');

function init() {
    
    
    // Event Listeners
    document.getElementById('btn-setup-back')?.addEventListener('click', () => { switchScreen('welcome'); });
    document.getElementById('btn-next').addEventListener('click', () => {
        // Request fullscreen to hide notification bar
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        }
        switchScreen('setup');
    });
    
        document.getElementById('btn-admin-portal').addEventListener('click', (e) => { e.preventDefault(); switchScreen('admin'); });
    document.getElementById('btn-admin-back').addEventListener('click', () => { switchScreen('welcome'); });
    document.getElementById('admin-form').addEventListener('submit', handleAdminRegister);
    btnShareLocation.addEventListener('click', getGPSLocation);
    setupForm.addEventListener('submit', handleSetupSubmit);
    
    // Auto-fill from previous session if exists
    const savedState = localStorage.getItem('master_appState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
                        if (state.surveyorName) document.getElementById('surveyor-name').value = state.surveyorName;
            if (state.adminId) document.getElementById('admin-id').value = state.adminId;
            
            if (state.location) locationInput.value = state.location;
                    } catch (e) {}
    }
}

function switchScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if(screen) {
            screen.classList.remove('active');
            setTimeout(() => screen.classList.add('hidden'), 400); 
        }
    });

    setTimeout(() => {
        if(screens[screenName]) {
            screens[screenName].classList.remove('hidden');
            setTimeout(() => screens[screenName].classList.add('active'), 10);
        }
    }, 400);
}

function getGPSLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
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
            locationStatus.textContent = "GPS locked successfully";
            locationStatus.style.color = "#10b981";
            btnShareLocation.disabled = false;
        },
        (error) => {
            console.error("Error getting location:", error);
            showToast('Failed to get GPS. You can enter it manually.', 'error');
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
    
    const surveyType = surveyTypeSelect.value;
        const appState = {
        adminId: document.getElementById('admin-id').value,
        adminName: window.currentLoadedAdminName || '',
        surveyorName: document.getElementById('surveyor-name').value,
        location: locationInput.value,
        locationNumber: document.getElementById('location-number') ? document.getElementById('location-number').value : ''
    };

    // Save state globally so the sub-apps can read it
    localStorage.setItem('master_appState', JSON.stringify(appState));
    
    // Redirect to the selected survey sub-app with a query param to skip its own setup
    window.location.href = `/index.html?skipSetup=true&admin=&adminName=&name=&loc=`;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => {
            if (container.contains(toast)) container.removeChild(toast);
        }, 300);
    }, 3000);
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }







let adminMode = 'login'; // 'login' or 'create'

function initAdminTabs() {
    const tabLogin = document.getElementById('tab-login');
    const tabCreate = document.getElementById('tab-create');
    const btnSubmit = document.getElementById('btn-submit-admin');
    const desc = document.getElementById('admin-desc');
    const resultDiv = document.getElementById('admin-result');
    const createFields = document.getElementById('create-fields');
    const confirmGroup = document.getElementById('confirm-password-group');
    
    // Create fields
    const adminName = document.getElementById('admin-name');
    const adminInst = document.getElementById('admin-institute');
    const adminCountry = document.getElementById('admin-country');
    const confirmPwd = document.getElementById('admin-password-confirm');
    
    tabLogin.addEventListener('click', () => {
        adminMode = 'login';
        tabLogin.style.background = 'var(--accent-primary)';
        tabLogin.style.color = 'white';
        tabLogin.style.borderColor = 'var(--accent-primary)';
        
        tabCreate.style.background = 'transparent';
        tabCreate.style.color = 'var(--text-primary)';
        tabCreate.style.borderColor = 'var(--glass-border)';
        
        btnSubmit.innerHTML = 'Login <i class="fa-solid fa-right-to-bracket"></i>';
        desc.textContent = 'Enter your email and password to retrieve your existing Admin ID and Spreadsheet link.';
        resultDiv.style.display = 'none';
        
        createFields.style.display = 'none';
        confirmGroup.style.display = 'none';
        
        // Remove required
        adminName.required = false;
        adminInst.required = false;
        adminCountry.required = false;
        confirmPwd.required = false;
    });
    
    tabCreate.addEventListener('click', () => {
        adminMode = 'create';
        tabCreate.style.background = 'var(--accent-primary)';
        tabCreate.style.color = 'white';
        tabCreate.style.borderColor = 'var(--accent-primary)';
        
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = 'var(--text-primary)';
        tabLogin.style.borderColor = 'var(--glass-border)';
        
        btnSubmit.innerHTML = 'Request OTP <i class="fa-solid fa-envelope"></i>';
        desc.textContent = 'Fill the form to create an account. A 6-digit OTP will be sent to your email.';
        resultDiv.style.display = 'none';
        
        createFields.style.display = 'block';
        confirmGroup.style.display = 'block';
        
        // Add required
        adminName.required = true;
        adminInst.required = true;
        adminCountry.required = true;
        confirmPwd.required = true;
    });
}

// Simple SHA-256 string hashing function for basic password obfuscation
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// You MUST replace this with your deployed Google Apps Script URL
const MASTER_APPS_SCRIPT_URL = (typeof window !== 'undefined' && window.ENV_APPS_SCRIPT_URL) ? window.ENV_APPS_SCRIPT_URL : 'https://script.google.com/macros/s/AKfycbz4jYswPv7LSFSkSymoQ8tBt1ui6ngLTwh5EAKNVxu5Qf16-oGT8zf6nMkczo-o5hQC/exec';

let pendingRegistrationData = {};

async function handleAdminRegister(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (adminMode === 'create') {
        const confirmPwd = document.getElementById('admin-password-confirm').value;
        if (password.length < 8) {
            return showToast('Password must be at least 8 characters long', 'error');
        }
        if (password !== confirmPwd) {
            return showToast('Passwords do not match', 'error');
        }
    }
    
    const btn = document.getElementById('btn-submit-admin');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = (adminMode === 'login' ? 'Logging in... ' : 'Sending OTP... ') + '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        
        
        if (adminMode === 'login') {
            const response = await fetch(MASTER_APPS_SCRIPT_URL + '?action=login&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password));
            const data = await response.json();
            
                        if (data.status === 'success') {
                document.getElementById('display-admin-id').textContent = data.adminId;
                document.getElementById('admin-sheet-link').href = data.sheetUrl;
                document.getElementById('admin-form').style.display = 'none';
                document.getElementById('admin-result-title').textContent = data.adminName ? 'Welcome, ' + data.adminName + '!' : 'Login Successful!';
                document.getElementById('admin-result-desc').textContent = 'Here is your link:';
                document.getElementById('admin-result').style.display = 'block';
                showToast('Logged in successfully!');
                
                // Load config into form
                try {
                    const cfg = JSON.parse(data.config || '{}');
                    document.getElementById('config-locations-count').value = cfg.locationsCount || '';
                    document.getElementById('config-mr-in').value = cfg.mrIn || 'In';
                    document.getElementById('config-mr-out').value = cfg.mrOut || 'Out';
                    document.getElementById('config-rt-d1').value = cfg.rtD1 || 'Direction 1';
                    document.getElementById('config-rt-d2').value = cfg.rtD2 || 'Direction 2';
                    document.getElementById('config-ii-d1').value = cfg.iiD1 || 'Galle Direction';
                    document.getElementById('config-ii-d2').value = cfg.iiD2 || 'Juulgaha Direction';
                    document.getElementById('config-bus').value = cfg.busRoutes || '';
                    
                    window.currentLoggedInAdminId = data.adminId;
                } catch(e) {}
            } else {
                showToast('Error: ' + data.message, 'error');
            }
        } else {
            // Create Account - Request OTP
            const name = document.getElementById('admin-name').value;
            const institute = document.getElementById('admin-institute').value;
            const country = document.getElementById('admin-country').value;
            
            const queryParams = new URLSearchParams({
                action: 'request_otp',
                email: email,
                name: name,
                institute: institute,
                country: country,
                password: password
            });
            const response = await fetch(MASTER_APPS_SCRIPT_URL + '?' + queryParams.toString());
            const data = await response.json();
            
            if (data.status === 'success') {
                pendingRegistrationData.email = email;
                document.getElementById('admin-form').style.display = 'none';
                document.getElementById('otp-form').style.display = 'block';
                showToast('OTP sent to your email!');
            } else {
                showToast('Error: ' + data.message, 'error');
            }
        }
    } catch (err) {
        showToast('Network error while processing request', 'error');
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

// OTP Verification
document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('otp-code').value;
    const btn = document.getElementById('btn-verify-otp');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = 'Verifying... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const queryParams = new URLSearchParams({
            action: 'verify_otp',
            email: pendingRegistrationData.email,
            otp: otp
        });
        const response = await fetch(MASTER_APPS_SCRIPT_URL + '?' + queryParams.toString());
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('display-admin-id').textContent = data.adminId;
            document.getElementById('admin-sheet-link').href = data.sheetUrl;
            document.getElementById('otp-form').style.display = 'none';
            document.getElementById('admin-result-title').textContent = 'Account Created! Welcome!';
            document.getElementById('admin-result-desc').textContent = 'A Google Sheet has been shared with your email.';
            document.getElementById('admin-result').style.display = 'block';
            showToast('Account verified and created successfully!');
        } else {
            showToast('Error: ' + data.message, 'error');
        }
    } catch (err) {
        showToast('Network error while verifying OTP', 'error');
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
});

document.getElementById('btn-otp-cancel').addEventListener('click', () => {
    document.getElementById('otp-form').style.display = 'none';
    document.getElementById('admin-form').style.display = 'block';
});

// Initialize tabs
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('tab-login')) initAdminTabs();
});









// --- FORGOT PASSWORD LOGIC ---
const btnForgot = document.getElementById('btn-forgot-password');
const formReset = document.getElementById('reset-form');
const step1 = document.getElementById('reset-step-1');
const step2 = document.getElementById('reset-step-2');
const btnResetReq = document.getElementById('btn-reset-request');
const btnResetSubmit = document.getElementById('btn-reset-submit');
const btnResetBack = document.getElementById('btn-reset-back');
const formAdmin = document.getElementById("admin-form");
const formOtp = document.getElementById("otp-form");

if (btnForgot) {
    btnForgot.addEventListener('click', () => {
        formAdmin.style.display = 'none';
        formOtp.style.display = 'none';
        formReset.style.display = 'block';
        step1.style.display = 'block';
        step2.style.display = 'none';
    });
}

if (btnResetBack) {
    btnResetBack.addEventListener('click', () => {
        formReset.style.display = 'none';
        formAdmin.style.display = 'block';
    });
}

if (btnResetReq) {
    btnResetReq.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value.trim();
        if (!email) { showToast('Please enter your email', 'error'); return; }
        
        showToast('Sending reset code...', 'info');
        const data = { action: 'reset_request_otp', email: email };
        
        try {
            const queryParams = new URLSearchParams(data);
            const response = await fetch(MASTER_APPS_SCRIPT_URL + '?' + queryParams.toString());
            const json = await response.json();
            
            if (json.status === 'success') {
                showToast('Reset code sent to email!', 'success');
                step1.style.display = 'none';
                step2.style.display = 'block';
            } else {
                showToast('Error: ' + json.message, 'error');
            }
        } catch(e) {
            showToast('Network error. Try again.', 'error');
        }
    });
}

if (btnResetSubmit) {
    btnResetSubmit.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value.trim();
        const otp = document.getElementById('reset-otp').value.trim();
        const newPassword = document.getElementById('reset-new-password').value;
        const confirmPassword = document.getElementById('reset-confirm-password').value;
        
        if (!otp || !newPassword || !confirmPassword) {
            showToast('Please fill all fields', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }
        
        showToast('Updating password...', 'info');
        const data = { action: 'reset_password', email: email, otp: otp, newPassword: newPassword };
        
        try {
            const queryParams = new URLSearchParams(data);
            const response = await fetch(MASTER_APPS_SCRIPT_URL + '?' + queryParams.toString());
            const json = await response.json();
            
            if (json.status === 'success') {
                showToast('Password updated successfully!', 'success');
                formReset.style.display = 'none';
                formAdmin.style.display = 'block';
            } else {
                showToast('Error: ' + json.message, 'error');
            }
        } catch(e) {
            showToast('Network error. Try again.', 'error');
        }
    });
}




// --- SHOW PASSWORD LOGIC ---
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        
        if (input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
            this.style.color = 'var(--accent-primary)';
        } else {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
            this.style.color = 'var(--text-secondary)';
        }
    });
});






document.getElementById('config-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-config');
    const orig = btn.innerHTML;
    btn.innerHTML = 'Saving... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    const cfg = {
        locationsCount: document.getElementById('config-locations-count').value,
        mrIn: document.getElementById('config-mr-in').value,
        mrOut: document.getElementById('config-mr-out').value,
        rtD1: document.getElementById('config-rt-d1').value,
        rtD2: document.getElementById('config-rt-d2').value,
        iiD1: document.getElementById('config-ii-d1').value,
        iiD2: document.getElementById('config-ii-d2').value,
        busRoutes: document.getElementById('config-bus').value
    };
    
    try {
        const queryParams = new URLSearchParams({
            action: 'save_config',
            adminId: window.currentLoggedInAdminId,
            config: JSON.stringify(cfg)
        });
        const res = await fetch(MASTER_APPS_SCRIPT_URL + '?' + queryParams.toString());
        const data = await res.json();
        if(data.status === 'success') showToast('Configuration saved!');
        else showToast('Error: ' + data.message, 'error');
    } catch(err) {
        showToast('Network error saving config', 'error');
    }
    
    btn.innerHTML = orig;
    btn.disabled = false;
});

document.getElementById('btn-load-settings')?.addEventListener('click', async () => {
    const adminId = document.getElementById('admin-id').value.trim();
    if(!adminId) return showToast('Enter Admin ID first', 'error');
    
    const btn = document.getElementById('btn-load-settings');
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    try {
        const res = await fetch(MASTER_APPS_SCRIPT_URL + '?action=get_config&adminId=' + encodeURIComponent(adminId));
        const data = await res.json();
        if(data.status === 'success') {
            showToast('Settings loaded!');
            localStorage.setItem('survey_config', data.config);
            window.currentLoadedAdminName = data.adminName || 'Admin';
            
            try {
                const cfg = JSON.parse(data.config);
                if(cfg.locationsCount && parseInt(cfg.locationsCount) > 0) {
                    const select = document.getElementById('location-number');
                    select.innerHTML = '<option value="" disabled selected>Select number</option>';
                    const count = parseInt(cfg.locationsCount);
                    for(let i = 1; i <= count; i++) {
                        const opt = document.createElement('option');
                        opt.value = i.toString();
                        opt.textContent = i.toString();
                        select.appendChild(opt);
                    }
                    document.getElementById('location-number-group').style.display = 'block';
                } else {
                    document.getElementById('location-number-group').style.display = 'none';
                    document.getElementById('location-number').value = '';
                }
            } catch(e) {}
        } else {
            showToast(data.message, 'error');
        }
    } catch(e) {
        showToast('Error loading settings', 'error');
    }
    btn.textContent = 'Load';
    btn.disabled = false;
});
