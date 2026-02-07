import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// إعدادات Firebase
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

// متغير مؤقت لحفظ المستخدم قبل اختيار الدور
let tempUser = null;

// ==========================================
// 1. منطق تسجيل الدخول
// ==========================================

// زر دخول قوقل
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        checkUserInDatabase(user);
    } catch (error) {
        console.error(error);
        alert("فشل الدخول: " + error.message);
    }
};

// زر دخول ايميل (للمستخدمين القدامى)
document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        checkUserInDatabase(cred.user);
    } catch (error) {
        alert("خطأ في البريد أو كلمة المرور");
    }
});

// فحص وجود المستخدم في قاعدة البيانات
async function checkUserInDatabase(user) {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        // المستخدم موجود ولديه دور -> ادخل للنظام
        const userData = docSnap.data();
        enterApp(userData);
    } else {
        // مستخدم جديد -> أظهر نافذة اختيار الدور
        tempUser = user;
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('role-modal').style.display = 'flex';
    }
}

// ==========================================
// 2. منطق اختيار الدور (إنشاء الحساب)
// ==========================================
window.selectRole = async (role) => {
    if (!tempUser) return;

    try {
        // تجهيز بيانات المستخدم الجديد
        const newUserData = {
            name: tempUser.displayName || tempUser.email.split('@')[0],
            email: tempUser.email,
            photo: tempUser.photoURL,
            role: role, // (admin, teacher, student)
            createdAt: new Date(),
            uid: tempUser.uid
        };

        // حفظ في Firestore
        await setDoc(doc(db, "users", tempUser.uid), newUserData);
        
        // إخفاء النافذة والدخول
        document.getElementById('role-modal').style.display = 'none';
        enterApp(newUserData);
        
    } catch (e) {
        alert("حدث خطأ أثناء حفظ البيانات: " + e.message);
        location.reload();
    }
};

// ==========================================
// 3. الدخول للنظام (Dashboard)
// ==========================================
function enterApp(userData) {
    // إخفاء شاشات التحميل والدخول
    document.getElementById('loader').style.display = 'none';
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('role-modal').style.display = 'none';
    
    // إظهار التطبيق
    document.getElementById('main-app').style.display = 'flex';

    // تعبئة البيانات الشخصية
    document.getElementById('sidebar-name').innerText = userData.name;
    // استخدام الصورة المرفوعة إذا لم يكن لديه صورة قوقل
    document.getElementById('user-avatar').src = userData.photo || "IMG_3825.png";
    
    // تعيين المسمى الوظيفي
    let roleText = "طالب";
    if (userData.role === 'admin') roleText = "مدير النظام";
    if (userData.role === 'teacher') roleText = "معلم";
    document.getElementById('sidebar-role').innerText = roleText;

    // التحكم في القوائم حسب الدور (Security)
    if (userData.role === 'student') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'block');
    } else if (userData.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
    } else {
        // للمعلم (يخفي الاثنين مؤقتاً أو يظهر ما يخصه)
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
    }
}

// ==========================================
// 4. أدوات التحكم (خروج، تنقل)
// ==========================================
window.logout = () => {
    signOut(auth).then(() => location.reload());
};

window.navigate = (viewId) => {
    // إخفاء كل الصفحات
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // إظهار الصفحة المطلوبة
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // تحديث القائمة النشطة
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // إغلاق القائمة في الجوال
    document.getElementById('sidebar').classList.remove('open');
};

window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('open');
};

// مراقب الجلسة (للبقاء مسجل الدخول عند تحديث الصفحة)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // إذا كان مسجل دخول، تحقق من بياناته
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            enterApp(snap.data());
        } else {
            // مسجل في Auth لكن ليس في الداتابيس (نادرة الحدوث)
            checkUserInDatabase(user);
        }
    } else {
        // غير مسجل
        document.getElementById('loader').style.display = 'none';
        document.getElementById('auth-view').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
});
