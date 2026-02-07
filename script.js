import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔴🔴 إعدادات Firebase (لا تنس التأكد من إعداداتك) 🔴🔴
const firebaseConfig = {
    apiKey: "AIzaSyDEecBUfiZlgYZZRnt4IoUfRRCBTRwOpjc",
    authDomain: "shagsu-e847b.firebaseapp.com",
    projectId: "shagsu-e847b",
    storageBucket: "shagsu-e847b.firebasestorage.app",
    messagingSenderId: "194121088471",
    appId: "1:194121088471:web:9157152e8e724a903e9f92",
    measurementId: "G-BGH2TX47WB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// متغير مؤقت لتخزين المستخدم قبل اختيار الدور
let tempUser = null;

// ==========================================
// 1. نظام الدخول والتحقق
// ==========================================

// تسجيل الدخول عبر Google
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        checkUserExists(user);
    } catch (error) {
        alert("خطأ في الدخول: " + error.message);
    }
};

// تسجيل الدخول عبر الإيميل (تجريبي)
document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        checkUserExists(cred.user);
    } catch (error) {
        alert("فشل الدخول. تأكد من البيانات.");
    }
});

// التحقق: هل المستخدم جديد أم قديم؟
async function checkUserExists(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        // مستخدم قديم -> ومعه دور -> ادخل
        enterApp(docSnap.data());
    } else {
        // مستخدم جديد -> افتح نافذة اختيار الدور
        tempUser = user;
        document.getElementById('auth-view').style.display = 'none'; // إخفاء الدخول
        document.getElementById('role-modal').style.display = 'flex'; // إظهار النافذة
    }
}

// ==========================================
// 2. اختيار الدور (للمستخدم الجديد)
// ==========================================
window.selectRole = async (role) => {
    if (!tempUser) return;
    
    // حفظ بيانات المستخدم الجديد مع الدور المختار
    try {
        const userData = {
            name: tempUser.displayName || tempUser.email.split('@')[0],
            email: tempUser.email,
            photo: tempUser.photoURL,
            role: role, // admin, teacher, student
            createdAt: new Date()
        };

        await setDoc(doc(db, "users", tempUser.uid), userData);
        
        // إغلاق النافذة والدخول
        document.getElementById('role-modal').style.display = 'none';
        enterApp(userData);
        
    } catch (e) {
        alert("حدث خطأ في إنشاء الحساب: " + e.message);
        location.reload(); // إعادة تحميل في حالة الخطأ
    }
};

// ==========================================
// 3. الدخول للتطبيق وتجهيز الواجهة
// ==========================================
function enterApp(userData) {
    // إخفاء شاشات الدخول والتحميل
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('role-modal').style.display = 'none';
    document.getElementById('loader').style.display = 'none';
    
    // إظهار التطبيق الرئيسي
    document.getElementById('main-app').style.display = 'flex';

    // تعبئة البيانات
    document.getElementById('sidebar-name').innerText = userData.name;
    document.getElementById('user-avatar').src = userData.photo || "images/IMG_3825.png";
    
    // ترجمة الدور للعربية
    let roleAr = "طالب";
    if(userData.role === 'admin') roleAr = "مدير النظام";
    if(userData.role === 'teacher') roleAr = "معلم";
    document.getElementById('sidebar-role').innerText = roleAr;

    // إظهار القوائم حسب الصلاحية
    if (userData.role === 'student') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'block');
    } else if (userData.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
    } else {
        // Teacher logic (يمكن إضافتها لاحقاً)
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
    }
}

// ==========================================
// 4. أدوات عامة (Navigation & Logout)
// ==========================================
window.logout = () => {
    signOut(auth).then(() => location.reload());
};

window.navigate = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    // إغلاق القائمة في الجوال
    document.getElementById('sidebar').classList.remove('open');
};

window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('open');
};

// مراقب الجلسة (للبقاء مسجل الدخول عند التحديث)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            enterApp(snap.data());
        } else {
            // حالة نادرة: مسجل في Auth ولكن ليس في Firestore
            checkUserExists(user); 
        }
    } else {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('auth-view').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});
