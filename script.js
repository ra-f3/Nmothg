import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔴🔴 ضع إعدادات مشروعك هنا 🔴🔴
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const views = {
    loader: document.getElementById('loader'),
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view')
};

let isLoginMode = true;

// Auth Observer
onAuthStateChanged(auth, (user) => {
    views.loader.style.display = 'none';
    if (user) {
        views.auth.style.display = 'none';
        views.dashboard.style.display = 'block';
        document.getElementById('user-display').innerText = user.email;
    } else {
        views.auth.style.display = 'flex';
        views.dashboard.style.display = 'none';
    }
});

// Event Listeners (أفضل من وضع onclick في HTML)
document.getElementById('auth-btn').addEventListener('click', handleAuth);
document.getElementById('toggle-auth').addEventListener('click', toggleAuthMode);
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
document.getElementById('save-btn').addEventListener('click', saveData);

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('toggle-auth');
    
    if (isLoginMode) {
        title.innerText = "تسجيل دخول المدير";
        btn.innerText = "دخول للنظام";
        toggle.innerText = "إنشاء حساب جديد";
    } else {
        title.innerText = "إنشاء حساب جديد";
        btn.innerText = "تسجيل حساب";
        toggle.innerText = "لديك حساب بالفعل؟";
    }
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msgBox = document.getElementById('auth-msg');

    if (!email || !password) return showAlert(msgBox, "البيانات ناقصة", "error");

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showAlert(msgBox, error.message, "error");
    }
}

async function saveData() {
    const title = document.getElementById('report-title').value;
    const content = document.getElementById('report-content').value;
    const msgBox = document.getElementById('db-msg');

    if (!title || !content) return showAlert(msgBox, "البيانات ناقصة", "error");

    try {
        await addDoc(collection(db, "reports"), {
            title, content, user: auth.currentUser.email, date: new Date()
        });
        showAlert(msgBox, "تم الحفظ بنجاح ✅", "success");
        document.getElementById('report-title').value = "";
        document.getElementById('report-content').value = "";
    } catch (e) {
        showAlert(msgBox, e.message, "error");
    }
}

function showAlert(element, text, type) {
    element.innerText = text;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 3000);
}
