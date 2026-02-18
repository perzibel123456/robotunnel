// ==========================================
// 1. הגדרות Firebase
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

// אתחול Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// ==========================================
// 2. לוגיקת הרשמה והתחברות
// ==========================================

// פונקציית הרשמה
function sign() {
    const email = document.getElementById("email_signup").value;
    const password = document.getElementById("password_signup").value;
    const errorDiv = document.getElementById("errorSignUp");

    // איפוס תצוגה
    errorDiv.style.display = "none";

    if (email === "" || password === "") {
        showLocalError("errorSignUp", "נא למלא אימייל וסיסמה.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // שמירת נתונים ב-DB (אופציונלי)
            db.ref('users/' + userCredential.user.uid).set({
                email: email,
                lastLogin: Date.now()
            });
            window.location.href = "index.html";
        })
        .catch((error) => {
            showLocalError("errorSignUp", translateError(error.code));
        });
}

// פונקציית התחברות
function logIn() {
    const email = document.getElementById("email_login").value;
    const password = document.getElementById("password_login").value;
    const errorDiv = document.getElementById("errorLogin");

    // איפוס תצוגה
    errorDiv.style.display = "none";

    if (email === "" || password === "") {
        showLocalError("errorLogin", "נא למלא אימייל וסיסמה.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = "index.html";
        })
        .catch((error) => {
            showLocalError("errorLogin", translateError(error.code));
        });
}

// ==========================================
// 3. פונקציות עזר לשגיאות
// ==========================================

function showLocalError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.innerText = message;
        errorDiv.style.display = "block";
    }
}

function translateError(code) {
    switch (code) {
        case 'auth/email-already-in-use': return "האימייל כבר רשום במערכת.";
        case 'auth/weak-password': return "הסיסמה חלשה מדי (מינימום 6 תווים).";
        case 'auth/user-not-found': return "לא נמצא משתמש עם האימייל הזה.";
        case 'auth/wrong-password': return "סיסמה שגויה.";
        case 'auth/invalid-email': return "כתובת אימייל לא תקינה.";
        default: return "שגיאה בכניסה: " + code;
    }
}
