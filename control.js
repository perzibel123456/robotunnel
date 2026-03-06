// ==========================================
// 1. הגדרות והתחברות ל-Firebase
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

// אתחול Firebase רק אם עדיין לא הופעל
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ==========================================
// 2. משתנים גלובליים לניהול מצב הרובוט
// כל משתנה מייצג "ביט" מתוך בית (Byte) אחד שיישלח לאלטרה.
// ==========================================
let currentScanMode = 0;   // Bit 7 (משקלו 128) - מצב אוטומטי לעומת ידני
let currentScanRun = 0;    // Bit 6 (משקלו 64) - הפעלת סריקה
let currentServo = 0;      // Bits 5-4 - זווית מצלמה
let currentSpeed = 0;      // Bit 3 (משקלו 8) - מהירות מנועים
let currentDirection = 0;  // Bits 2-0 - כיווני נסיעה

const statusText = document.getElementById('status-display');

// ==========================================
// 3. לוגיקה מרכזית ושליחת פקודות
// ==========================================

// פונקציה לחיבור כל הערכים יחד ושליחה לדאטאבייס של פיירבייס
function sendUpdate() {
    // חישוב הסכום הסופי של כל הביטים
    let finalCommand = currentScanMode + currentScanRun + currentServo + currentSpeed + currentDirection;
    
    // עדכון ב-Firebase תחת הנתיב '/toAltera'
    db.ref('/toAltera').set(finalCommand);
    
    // עדכון תצוגה במסך (אם קיים אלמנט כזה ב-HTML)
    const display = document.getElementById('status-display');
    if(display) display.innerText = `Cmd: ${finalCommand}`;
    
    console.log("Sent Command:", finalCommand);
}

/**
 * פונקציה לעדכון מערכת הסריקה - מוודא שהיא גלובלית (window)
 * שולטת על החלפה בין מצב ידני למצב סריקה
 */
window.updateScanSystem = function(type) {
    const btnMode = document.getElementById('btn-scan-mode');
    const btnRun = document.getElementById('btn-scan-run');

    if (type === 'mode') {
        // Toggle בין 0 ל-128
        currentScanMode = (currentScanMode === 128) ? 0 : 128;
        
        if (currentScanMode === 128) {
            btnMode.innerText = "מצב סריקה אוטומטי ";
            btnMode.classList.add('active-mode');
            btnRun.disabled = false; // פותח את לחצן הסריקה
        } else {
            btnMode.innerText = "מצב נסיעה ידנית ";
            btnMode.classList.remove('active-mode');
            btnRun.disabled = true; // נועל את לחצן הסריקה
            currentScanRun = 0; // מכבה סריקה אם עברנו לידני
            btnRun.classList.remove('active-mode');
            btnRun.innerText = "הפעל סריקה ועבור לתצוגה)";
        }
    } 
    else if (type === 'run') {
        // Toggle בין 0 ל-64
        currentScanRun = (currentScanRun === 64) ? 0 : 64;
        
        if (currentScanRun === 64) {
            btnRun.innerText = "סורק... ";
            btnRun.classList.add('active-mode');
            // השהייה של 600 מילי-שניות (0.6 שניות) לפני המעבר לדף
            // הזמן הזה מאפשר ל-sendUpdate() לסיים את השליחה ל-Firebase
            setTimeout(() => {
                window.location.href = "scan.html";
            }, 600); 
        }
        else {
            btnRun.innerText = "הפעל סריקה)";
            btnRun.classList.remove('active-mode');
        }
    }
    sendUpdate();
};

// --- ניהול מהירות ---
// פונקציה לבחירת מהירות נסיעה (עצירה או נסיעה)
function handleSpeedToggle(val) {
    if (val === 8) {
        currentSpeed = (currentSpeed === 8) ? 0 : 8;
    } else {
        currentSpeed = 0;
    }
    updateSpeedUI();
    sendUpdate();
}

// עדכון צבעי הכפתורים של המהירות במסך
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
// פונקציה להזזת המצלמה שמאלה/ימינה/מרכז
function setServo(val, btn) {
    currentServo = val;
    document.querySelectorAll('.btn-servo').forEach(b => b.classList.remove('active-mode'));
    btn.classList.add('active-mode');
    sendUpdate();
}

// פונקציה לקביעת כיוון הנסיעה
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



// המיפוי המקורי שלך לכפתורים
const moveMap = { 'mob-W': 1, 'mob-S': 2, 'mob-A': 3, 'mob-D': 4 };

// 1. טיפול בלחיצות עכבר ומסך מגע (הקוד המקורי שלך)
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

// ==========================================
// 2. תוספת: שליטה מלאה מהמקלדת (אנגלית + עברית)
// ==========================================

// מיפוי מקשי המקלדת לכפתורים הפיזיים במסך
const keyMap = {
    'w': 'mob-W', "'": 'mob-W', // W באנגלית או גרש (') בעברית
    'a': 'mob-A', 'ש': 'mob-A', // A באנגלית או ש' בעברית
    's': 'mob-S', 'ד': 'mob-S', // S באנגלית או ד' בעברית
    'd': 'mob-D', 'ג': 'mob-D'  // D באנגלית או ג' בעברית
};

// מאזין ללחיצה על מקש (תחילת תנועה)
document.addEventListener('keydown', (e) => {
    // מונע מהפקודה להישלח שוב ושוב ברצף כשהמפעיל מחזיק את המקש לחוץ
    if (e.repeat) return; 

    const key = e.key.toLowerCase(); // הופך לאותיות קטנות כדי לתמוך גם ב-Caps Lock
    const targetBtnId = keyMap[key];
    
    if (targetBtnId) {
        const btn = document.getElementById(targetBtnId);
        if (btn) {
            setMove(moveMap[targetBtnId]); // שולח פקודת תנועה
            btn.classList.add('active-mode'); // מדליק את הכפתור במסך שייראה לחוץ
        }
    }
});

// מאזין לעזיבת המקש (עצירת תנועה)
document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    const targetBtnId = keyMap[key];
    
    if (targetBtnId) {
        const btn = document.getElementById(targetBtnId);
        if (btn) {
            setMove(0); // שולח פקודת עצירה
            btn.classList.remove('active-mode'); // מכבה את תאורת הכפתור
        }
    }
});



    // משתנה גלובלי למצב הפנס
    let flashActive = 0; 

    const flashBtn = document.getElementById('btn-flash');

    if (flashBtn) {
        flashBtn.addEventListener('click', () => {
            // הפיכת המצב (אם היה 0 יהיה 1, אם היה 1 יהיה 0)
            flashActive = (flashActive === 0) ? 1 : 0;
            
            // עדכון ב-Firebase של מצב הפנס תחת 'flash'
            db.ref('/flash').set(flashActive);
            
            // עדכון ויזואלי של הכפתור
            if (flashActive === 1) {
                flashBtn.innerText = "פנס דולק";
                flashBtn.classList.add('active-mode');
            } else {
                flashBtn.innerText = "הפעל פנס";
                flashBtn.classList.remove('active-mode');
            }
            
            console.log("Flash state:", flashActive);
        });
    }

    // הגנה על העמוד - בדיקה אם המשתמש מחובר
    firebase.auth().onAuthStateChanged((user)=> {
        if(!user) {
            console.log(" not user")
            window.location.href = "/register.html"
            document.getElementById("scan").style.display = "none"
            document.getElementById("control").style.display = "none"

        }else{
            console.log("user")
             document.getElementById("scan").style.display = "block"
             document.getElementById("control").style.display = "block"
        }    
    });

    // האזנה ללחיצה על כפתור התנתקות
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault(); // מונע מעבר דף רגיל של קישור

            firebase.auth().signOut().then(() => {
                // התנתקות הצליחה
                console.log("User signed out");
                // הפניה לדף הכניסה או דף הבית
                window.location.href = "register.html"; 
            }).catch((error) => {
                // טיפול בשגיאות
                console.error("Error signing out: ", error);
                alert("אירעה שגיאה בהתנתקות");
            });
        });
    }

    // מצלמה - משיכת כתובת ה-IP הדינאמית של ה-ESP32-CAM מ-Firebase
    db.ref("/camIp").on("value", snap => {
        const ip = snap.val();
        if (ip) document.getElementById("ipcam").src = "http://" + ip + ":81/stream";
    });
});

// פונקציית התנתקות גלובלית (נוספה לכאן כדי למנוע שגיאות בקריאה מה-HTML)
function logout() {
    firebase.auth().signOut().then(() => {
        // --- התנתקות הצליחה ---
        console.log("המשתמש התנתק בהצלחה");
        
        // העברה לדף ההתחברות (שנה את הכתובת אם הדף שלך נקרא אחרת)
        window.location.href = "register.html"; 
        
    }).catch((error) => {
        // --- אירעה שגיאה ---
        console.error("שגיאה בהתנתקות:", error);
        alert("אירעה שגיאה בזמן ההתנתקות.");
    });
}
