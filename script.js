import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// متغير مؤقت لتخزين بيانات المستخدم أثناء اختيار الدور
let pendingUser = null; 

// 1. زر الدخول عبر جوجل
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // التحقق: هل هذا المستخدم مسجل من قبل؟
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            // مسجل سابقاً -> أدخله مباشرة
            console.log("مستخدم موجود");
        } else {
            // مستخدم جديد -> لا تدخله! أظهر نافذة اختيار الدور
            pendingUser = user; // احفظه مؤقتاً
            document.getElementById('role-selection-modal').style.display = 'flex';
        }
    } catch (error) {
        alert("خطأ: " + error.message);
    }
};

// 2. دالة إكمال التسجيل بعد اختيار الدور
window.completeGoogleSignup = async (selectedRole) => {
    if (!pendingUser) return;

    try {
        // الآن نحفظه في قاعدة البيانات مع الدور الذي اختاره
        await setDoc(doc(db, "users", pendingUser.uid), {
            name: pendingUser.displayName,
            email: pendingUser.email,
            photo: pendingUser.photoURL,
            role: selectedRole, // الدور الذي اختاره (admin/teacher/student)
            createdAt: new Date(),
            xp: 0,
            level: 1
        });

        // إخفاء النافذة
        document.getElementById('role-selection-modal').style.display = 'none';
        // (المراقب onAuthStateChanged سيكمل الباقي ويفتح التطبيق)
        
    } catch (e) {
        alert("حدث خطأ في الحفظ: " + e.message);
    }
};

// 3. مراقب الحالة (يوجه المستخدم حسب دوره)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        
        // إذا كان المستخدم جديداً ولم يختر دوره بعد، لا تفعل شيئاً (انتظر النافذة)
        if (!docSnap.exists()) return; 

        const userData = docSnap.data();
        
        // إعداد الواجهة
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('dash-name').innerText = userData.name;
        document.getElementById('header-avatar').src = userData.photo;
        document.getElementById('role-display').innerText = 
            userData.role === 'admin' ? 'مدير النظام' : 
            userData.role === 'teacher' ? 'معلم' : 'طالب';

        // إخفاء/إظهار العناصر حسب الدور
        if (userData.role === 'student') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.student-only').forEach(el => el.style.display = 'block');
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
            document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
        }
    } else {
        document.getElementById('auth-view').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
    document.getElementById('loader').style.display = 'none';
});

window.logout = () => signOut(auth);
window.navigate = (id) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${id}`).classList.add('active');
};
window.toggleSidebar = () => document.getElementById('sidebar').classList.toggle('open');
