// ============================================================================
// 1. הגדרות והתחברות (CONFIGURATION)
// ============================================================================
const firebaseConfig = {
    apiKey: "AIzaSyB7EtdQumROer8xuzWu9wffjEvQz8XdbNU",
    authDomain: "rubotunnel.firebaseapp.com",
    databaseURL: "https://rubotunnel-default-rtdb.firebaseio.com",
    projectId: "rubotunnel",
    storageBucket: "rubotunnel.firebasestorage.app",
    messagingSenderId: "211308486888",
    appId: "1:211308486888:web:9d8e8b7594fd646898a95d"
};

// --- הסבר למבחן: Singleton Pattern ---
// אנו בודקים האם האפליקציה כבר הוגדרה (!firebase.apps.length).
// זה מונע שגיאות של "אתחול כפול" (Double Initialization) אם הקוד נטען פעמיים.
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ============================================================================
// 2. משתנים גלובליים (GLOBAL VARIABLES - STATE MANAGEMENT)
// ============================================================================
// --- הסבר למבחן: שמירת מצב (State Persistence) ---
// אנו חייבים לשמור את הערך האחרון של כל רכיב במשתנה נפרד.
// סיבה: כשלוחצים על "סע קדימה", הרובוט צריך לדעת באיזו מהירות לנסוע (מה שנבחר קודם).
// ללא המשתנים האלו, כל לחיצה הייתה מאפסת את שאר ההגדרות.
let currentSpeed = 0;       
let currentServo = 0;       
let currentDirection = 0;   
let currentScan = 0; // ערך בינארי: 0 (כבוי) או 128 (דולק)

const statusText = document.getElementById('status-display');

// ============================================================================
// 3. לוגיקה ראשית (MAIN LOGIC & AGGREGATION)
// ============================================================================

/**
 * פונקציה: sendUpdate
 * תפקיד: איסוף כל הנתונים ושליחתם לשרת.
 */
function sendUpdate() {
    // --- הסבר למבחן: אגרגציה של מידע (Data Aggregation) ---
    // במקום לשלוח 4 בקשות נפרדות לשרת, אנו מחברים את כל המספרים למספר אחד.
    // זה עובד כי לכל רכיב יש "משקל" מתמטי שונה שלא מתנגש עם האחרים.
    let finalCommand = currentDirection + currentSpeed + currentServo + currentScan;
    
    // --- הסבר למבחן: כתיבה לדאטה-בייס (Write Operation) ---
    // הפקודה .set() דורסת את הערך הקיים בנתיב ומחליפה אותו בחדש.
    db.ref('/toAltera').set(finalCommand);
    
    // דיבוג: הצגת הערך שנשלח במסך ובקונסול
    if(statusText) statusText.innerText = `Cmd: ${finalCommand}`;
    console.log("Sent Command:", finalCommand);
}

// פונקציות עזר לשינוי ערכים ספציפיים
// כל פונקציה מעדכנת את המשתנה הגלובלי שלה וקוראת ל-sendUpdate
function setMove(val) { 
    currentDirection = val; 
    sendUpdate(); 
}

function setSpeed(level) {
    // מיפוי (Mapping): המרת רמת המשתמש (1,2,3) לערך החומרה (8,16,24)
    const speedValues = { 0: 0, 1: 8, 2: 16, 3: 24 };
    currentSpeed = speedValues[level] || 0;

    // עדכון המראה של הכפתורים (UX)
    updateButtonGroup('.btn-speed', level);
    sendUpdate();
}

function setServo(val) {
    currentServo = val;
    updateButtonGroup('.btn-servo', val);
    sendUpdate();
}

/**
 * פונקציה: updateButtonGroup
 * --- הסבר למבחן: עיקרון DRY (Don't Repeat Yourself) ---
 * במקום לכתוב את אותו קוד עיצוב פעמיים (פעם למהירות ופעם לסרוו),
 * יצרנו פונקציה גנרית שמקבלת את סוג הכפתורים ומעדכנת אותם.
 */
function updateButtonGroup(selector, activeVal) {
    document.querySelectorAll(selector).forEach(btn => {
        // המרת המידע שנמצא ב-data-attribute למספר
        let v = parseInt(btn.getAttribute(selector === '.btn-speed' ? 'data-speed' : 'data-servo'));
        
        // מניפולציה על ה-DOM: הוספה והסרה של מחלקות (Classes)
        if (v === activeVal) {
            btn.classList.add('active', selector === '.btn-servo' ? 'btn-primary' : 'btn-secondary');
            btn.classList.remove(selector === '.btn-servo' ? 'btn-outline-primary' : 'btn-outline-secondary');
        } else {
            btn.classList.remove('active', selector === '.btn-servo' ? 'btn-primary' : 'btn-secondary');
            btn.classList.add(selector === '.btn-servo' ? 'btn-outline-primary' : 'btn-outline-secondary');
        }
    });
}

// ============================================================================
// 4. כפתורים מיוחדים - לוגיקת מתגים (TOGGLE LOGIC)
// ============================================================================

// כפתור SCAN (מנוהל מקומית ושולח עדכון ל-toAltera)
window.toggleScan = function() {
    // אופרטור טרנרי (Ternary Operator): תנאי מקוצר
    // אם הערך הוא 0 -> הפוך ל-128. אחרת -> הפוך ל-0.
    currentScan = (currentScan === 0) ? 128 : 0;
    sendUpdate();
};

// כפתור FLASH (מנוהל בנתיב נפרד בשרת)
window.toggleFlash = function() {
    // --- הסבר למבחן: קריאה חד פעמית (.once) ---
    // אנו משתמשים ב-once ולא ב-on כי אנו צריכים את המידע רק ברגע הלחיצה
    // כדי לחשב את המצב ההפוך (אם דולק -> כבה, ולהפך).
    db.ref("/flash").once("value").then(snapshot => {
        const current = snapshot.val();
        const newState = (current === 1) ? 0 : 1;
        db.ref("/flash").set(newState);
    });
};

// ============================================================================
// 5. מאזינים ל-Firebase (LISTENERS - ASYNCHRONOUS EVENTS)
// ============================================================================
// הערה כללית: הפונקציות כאן רצות רק כשמגיע מידע חדש מהשרת.

// א. קבלת IP למצלמה
db.ref("/camIp").on("value", snapshot => {
    const ip = snapshot.val();
    const camElement = document.getElementById("ipcam");
    // בדיקת תקינות (Validation) לפני שימוש באלמנט
    if (ip && camElement) {
        camElement.src = "http://" + ip + ":81/stream";
    }
});

// ב. האזנה לשינוי בפלאש (סנכרון התצוגה למצב האמת)
db.ref("/flash").on("value", snapshot => {
    const state = snapshot.val(); 
    const btn = document.getElementById("flashBtn");
    
    if (btn) {
        // --- הסבר למבחן: עיצוב דינמי (Dynamic Styling) ---
        // אנו משתמשים ב-classList כדי להפריד בין הלוגיקה (JS) לעיצוב (CSS).
        if (state === 1) {
            btn.innerHTML = "FLASH: דולק";
            btn.classList.add("active-mode"); // הוספת מחלקה שצובעת בצהוב
        } else {
            btn.innerHTML = "FLASH: כבוי";
            btn.classList.remove("active-mode"); // הסרת המחלקה (חזרה לאפור)
        }
    }
});

// ג. האזנה לשינוי ב-toAltera (עדכון כפתור SCAN)
// --- זהו החלק החשוב ביותר להבנת עבודה עם ביטים ---
db.ref("/toAltera").on("value", snapshot => {
    const val = snapshot.val() || 0;
    const btn = document.getElementById("btn128");

    // --- הסבר למבחן: Bitwise AND (&) ---
    // הפעולה (val & 128) מבודדת רק את הביט השמיני.
    // גם אם המספר המלא הוא 137 (שזה 128 + 8 + 1), הפעולה תחזיר 128.
    // זה מאפשר לנו לדעת אם הסריקה דולקת בלי להתבלבל מהמהירות או הכיוון.
    const isScanOn = (val & 128) === 128;
    
    // סנכרון המשתנה המקומי למקרה שהשינוי הגיע ממחשב אחר
    currentScan = isScanOn ? 128 : 0;

    if (btn) {
        if (isScanOn) {
            btn.innerHTML = "SCAN: דולק";
            btn.classList.add("active-mode");
        } else {
            btn.innerHTML = "SCAN: כבוי";
            btn.classList.remove("active-mode");
        }
    }
});

// ד. האזנה לחיישנים (fromAltera)
db.ref("/fromAltera").on("value", snapshot => {
    const data = snapshot.val();
    if (data) {
        // פונקציית עזר פנימית לעדכון טקסט ב-HTML
        const updateText = (id, val) => {
            const el = document.getElementById(id);
            // שימוש באופרטור טרנרי לבדיקה אם הערך קיים
            if (el) el.innerText = (val !== undefined) ? val : "--";
        };
        
        // שימוש באופרטור ?? (Nullish Coalescing) - אם A לא קיים, נסה את a
        updateText("valueA", data.A ?? data.a);
        updateText("valueB", data.B ?? data.b);
        updateText("valueC", data.C ?? data.c);
    }
});

// ============================================================================
// 6. אירועי משתמש (USER EVENTS & INITIALIZATION)
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("System Ready");

    // הצמדת אירועים (Event Listeners) לכפתורים באופן גורף
    document.querySelectorAll('.btn-speed').forEach(b => 
        b.addEventListener('click', function() { setSpeed(parseInt(this.getAttribute('data-speed'))); })
    );
    document.querySelectorAll('.btn-servo').forEach(b => 
        b.addEventListener('click', function() { setServo(parseInt(this.getAttribute('data-servo'))); })
    );

    // טיפול באירועי מגע (Touch) ועכבר עבור כפתורי הכיוונים
    const map = { 'mob-W': 1, 'mob-A': 2, 'mob-D': 3, 'mob-S': 4 };
    Object.keys(map).forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            // פונקציות Wrapper למניעת התנהגות ברירת מחדל (כמו גלילה)
            const start = (e) => { e.preventDefault(); setMove(map[id]); };
            const stop = (e) => { e.preventDefault(); setMove(0); };
            
            // תמיכה גם במובייל וגם במחשב
            btn.addEventListener('touchstart', start);
            btn.addEventListener('touchend', stop);
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop); // עצירה אם העכבר יצא מהכפתור
        }
    });

    // האזנה למקלדת (Keyboard Events)
    window.addEventListener("keydown", function(e) {
        if (e.repeat) return; // מניעת הצפה של פקודות בלחיצה ארוכה
        const k = e.key.toUpperCase();
        
        // שליטה באמצעות מספרים למהירות
        if(['0','1','2','3'].includes(k)) setSpeed(parseInt(k));
        
        // שליטה ב-WASD לתנועה
        if(k === 'W'|| k==="'") setMove(1);
        if(k === 'A'|| k==='ש') setMove(2);
        if(k === 'D'|| k==='ג') setMove(3);
        if(k === 'S'|| k==='ד') setMove(4);
        
        // שליטה ב-QZE לסרוו
        if(k === 'Q') setServo(64); 
        if(k === 'E') setServo(32); 
        if(k === 'Z') setServo(0);
    });

    // עצירת הרובוט בעזיבת מקש
    window.addEventListener("keyup", (e) => { 
        if(['W','A','S','D',"'",'ש','ד','ג'].includes(e.key.toUpperCase())) setMove(0); 
    });
});