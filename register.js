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

// אתחול Firebase (רק פעם אחת)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase App Initialized.");
}

const auth = firebase.auth();
const db = firebase.database();

// ==========================================
// 2. מנהל האבטחה והתפריט (Auth Guard & Navbar)
// ==========================================
auth.onAuthStateChanged((user) => {
    
    // --- א. בדיקת אבטחה (האם מותר להיות בדף?) ---
    // רשימת הדפים שחייבים להיות מחוברים כדי לראות אותם
    const protectedPages = ["control.html", "gallery.html"]; 
    const currentPage = window.location.pathname; // הכתובת הנוכחית בדפדפן

    // בודק האם אנחנו נמצאים כרגע באחד הדפים החסומים
    const isRestricted = protectedPages.some(page => currentPage.includes(page));

    if (user) {
        // === משתמש מחובר ===
        console.log("User is logged in:", user.email);

        // עדכון התפריט: הפוך את "כניסה" ל"התנתק"
        updateNavbarToLogout();

        // אם הדף היה מוסתר, נציג אותו עכשיו
        document.body.style.display = "block"; 

    } else {
        // === משתמש מנותק ===
        console.log("User is NOT logged in.");

        if (isRestricted) {
            // אם המשתמש מנסה להיכנס לדף חסום -> זרוק אותו החוצה
            alert("גישה לחלק זה מותרת למשתמשים רשומים בלבד.");
            window.location.href = "register.html";
        }
    }
});

// פונקציה לעדכון התפריט כשיש משתמש מחובר
function updateNavbarToLogout() {
    // מחפש את הלינק שמוביל ל-register.html בתפריט
    const loginLink = document.querySelector('a[href="register.html"]');
    
    if (loginLink) {
        loginLink.textContent = "התנתק"; // משנה את הטקסט
        loginLink.href = "#"; // מבטל את הקישור הרגיל
        loginLink.classList.remove("active");
        
        // מוסיף אירוע לחיצה להתנתקות
        loginLink.addEventListener("click", (e) => {
            e.preventDefault();
            logOut(); // קורא לפונקציית ההתנתקות
        });
    }
}

// ==========================================
// 3. פונקציות הרשמה והתחברות (Login / Signup)
// ==========================================

// פונקציה לניקוי שדות הקלט
function clearInputs() {
    const ids = ["email_signup", "password_signup", "email_login", "password_login"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

// --- הרשמה (Sign Up) ---
function sign() {
    const errorElement = document.getElementById("errorSignUp");
    const emailInput = document.getElementById("email_signup");
    const passwordInput = document.getElementById("password_signup");

    if (!emailInput || !passwordInput) return; // הגנה למקרה שאנחנו לא בדף הרשמה

    const email = emailInput.value;
    const password = passwordInput.value;

    // איפוס הודעות
    errorElement.style.display = "none";
    errorElement.classList.remove("alert-success", "alert-danger");

    if (password === "" || email === "") {
        showError(errorElement, "המייל או הסיסמה לא יכולים להיות ריקים.");
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        
        // שמירת המשתמש ב-Database (אופציונלי)
        db.ref('/users/' + user.uid).set({
            email: user.email,
            createdAt: Date.now()
        });

        // הודעת הצלחה
        errorElement.classList.add("alert-success");
        errorElement.innerText = "ההרשמה הצליחה! מועבר למערכת...";
        errorElement.style.display = "block";
        
        clearInputs();
        
        // מעבר אוטומטי לדף השליטה
        setTimeout(() => { window.location.href = "control.html"; }, 1500);
    })
    .catch((error) => {
        showError(errorElement, translateError(error.code));
    });
}

// --- התחברות (Log In) ---
function logIn() {
    const errorElement = document.getElementById("errorLogin");
    const emailInput = document.getElementById("email_login");
    const passwordInput = document.getElementById("password_login");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    errorElement.style.display = "none";
    errorElement.classList.remove("alert-success", "alert-danger");
    
    if (password === "" || email === "") {
        showError(errorElement, "נא למלא אימייל וסיסמה.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // הודעת הצלחה
        errorElement.classList.add("alert-success");
        errorElement.innerText = "התחברת בהצלחה! מעביר לרובוט...";
        errorElement.style.display = "block";
        
        clearInputs();

        // מעבר אוטומטי לדף השליטה
        setTimeout(() => { window.location.href = "control.html"; }, 1000); 
    })
    .catch((error) => {
        showError(errorElement, translateError(error.code));
    });
}

// --- התנתקות (Log Out) ---
function logOut() {
    auth.signOut().then(() => {
        console.log("User signed out.");
        alert("התנתקת בהצלחה.");
        window.location.href = "register.html"; 
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}

// ==========================================
// 4. פונקציות עזר
// ==========================================

function showError(element, message) {
    element.innerText = message;
    element.classList.add("alert-danger");
    element.style.display = "block";
}

// תרגום שגיאות מאנגלית לעברית
function translateError(errorCode) {
    switch (errorCode) {
        case "auth/email-already-in-use": return "כתובת המייל כבר רשומה במערכת.";
        case "auth/invalid-email": return "כתובת המייל אינה תקינה.";
        case "auth/weak-password": return "הסיסמה חלשה מדי (מינימום 6 תווים).";
        case "auth/user-not-found": return "משתמש לא נמצא.";
        case "auth/wrong-password": return "סיסמה שגויה.";
        default: return "שגיאה: " + errorCode;
    }
}