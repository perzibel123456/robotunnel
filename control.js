// ==========================================
// 1. הגדרות והתחברות (CONFIGURATION)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB7EtdQumROer8xuzWu9wffjEvQz8XdbNU",
    authDomain: "rubotunnel.firebaseapp.com",
    databaseURL: "https://rubotunnel-default-rtdb.firebaseio.com",
    projectId: "rubotunnel",
    storageBucket: "rubotunnel.firebasestorage.app",
    messagingSenderId: "211308486888",
    appId: "1:211308486888:web:9d8e8b7594fd646898a95d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ==========================================
// 2. משתנים גלובליים - חשוב להשאיר בחוץ
// ==========================================
let currentScanMode = 0;   // Bit 7 (128)
let currentScanRun = 0;    // Bit 6 (64)
let currentServo = 0;      // Bits 5-4
let currentSpeed = 0;      // Bit 3 (8)
let currentDirection = 0;  // Bits 2-0

const statusText = document.getElementById('status-display');

// ==========================================
// 3. לוגיקה מרכזית ושליחה
// ==========================================

function sendUpdate() {
    // חישוב הסכום הסופי של כל הביטים
    let finalCommand = currentScanMode + currentScanRun + currentServo + currentSpeed + currentDirection;
    
    // עדכון ב-Firebase
    db.ref('/toAltera').set(finalCommand);
    
    // עדכון תצוגה במסך (אם קיים אלמנט)
    const display = document.getElementById('status-display');
    if(display) display.innerText = `Cmd: ${finalCommand}`;
    
    console.log("Sent Command:", finalCommand);
}

/**
 * פונקציה לעדכון מערכת הסריקה - מוודא שהיא גלובלית (window)
 */
window.updateScanSystem = function(type) {
    const btnMode = document.getElementById('btn-scan-mode');
    const btnRun = document.getElementById('btn-scan-run');

    if (type === 'mode') {
        // Toggle בין 0 ל-128
        currentScanMode = (currentScanMode === 128) ? 0 : 128;
        
        if (currentScanMode === 128) {
            btnMode.innerText = "מצב אוטומטי (128)";
            btnMode.classList.add('active-mode');
            btnRun.disabled = false; // פותח את לחצן הסריקה
        } else {
            btnMode.innerText = "מצב ידני (0)";
            btnMode.classList.remove('active-mode');
            btnRun.disabled = true; // נועל את לחצן הסריקה
            currentScanRun = 0; // מכבה סריקה אם עברנו לידני
            btnRun.classList.remove('active-mode');
            btnRun.innerText = "הפעל סריקה (0)";
        }
    } 
    else if (type === 'run') {
        // Toggle בין 0 ל-64
        currentScanRun = (currentScanRun === 64) ? 0 : 64;
        
        if (currentScanRun === 64) {
            btnRun.innerText = "סורק... (64)";
            btnRun.classList.add('active-mode');
        } else {
            btnRun.innerText = "הפעל סריקה (0)";
            btnRun.classList.remove('active-mode');
        }
    }
    sendUpdate();
};

// --- ניהול מהירות ---
function handleSpeedToggle(val) {
    if (val === 8) {
        currentSpeed = (currentSpeed === 8) ? 0 : 8;
    } else {
        currentSpeed = 0;
    }
    updateSpeedUI();
    sendUpdate();
}

function updateSpeedUI() {
    const stopBtn = document.getElementById('sp-stop');
    const goBtn = document.getElementById('sp-go');
    if(!stopBtn || !goBtn) return;

    stopBtn.classList.remove('active-mode');
    goBtn.classList.remove('active-mode');

    if (currentSpeed === 8) {
        goBtn.classList.add('active-mode');
    } else {
        stopBtn.classList.add('active-mode');
    }
}

// --- ניהול סרוו ותנועה ---
function setServo(val, btn) {
    currentServo = val;
    document.querySelectorAll('.btn-servo').forEach(b => b.classList.remove('active-mode'));
    btn.classList.add('active-mode');
    sendUpdate();
}

function setMove(val) {
    currentDirection = val;
    sendUpdate();
}

// ==========================================
// 4. מאזינים לאירועים (Listeners)
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // מהירות
    document.querySelectorAll('.btn-speed').forEach(btn => {
        btn.addEventListener('click', () => handleSpeedToggle(parseInt(btn.getAttribute('data-speed'))));
    });

    // סרוו
    document.querySelectorAll('.btn-servo').forEach(btn => {
        btn.addEventListener('click', () => setServo(parseInt(btn.getAttribute('data-servo')), btn));
    });

    // ניווט WASD (W=1, S=2, A=3, D=4)
    const moveMap = { 'mob-W': 1, 'mob-S': 2, 'mob-A': 3, 'mob-D': 4 };
    Object.keys(moveMap).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            const start = (e) => { e.preventDefault(); setMove(moveMap[id]); btn.classList.add('active-mode'); };
            const stop = (e) => { e.preventDefault(); setMove(0); btn.classList.remove('active-mode'); };
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('touchstart', start);
            btn.addEventListener('touchend', stop);
        }
    });

    // מצלמה
    db.ref("/camIp").on("value", snap => {
        const ip = snap.val();
        if (ip) document.getElementById("ipcam").src = "http://" + ip + ":81/stream";
    });
});
