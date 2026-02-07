import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, setDoc, doc, onSnapshot, query, orderBy, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔴 ضع مفتاح Firebase الخاص بك هنا 🔴
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

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    app: document.getElementById('main-app'),
    loader: document.getElementById('loader')
};

let currentUserData = null;

// ================= AUTHENTICATION =================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // التحقق من بيانات المستخدم في قاعدة البيانات
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            currentUserData = userSnap.data();
        } else {
            // مستخدم جديد (عبر جوجل) -> ننشئ له سجلاً افتراضياً كطالب
            currentUserData = {
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                role: 'student', // الافتراضي
                photo: user.photoURL,
                xp: 0,
                level: 1,
                badges: []
            };
            await setDoc(userRef, currentUserData);
        }

        setupUI(currentUserData);
        views.loader.style.display = 'none';
        views.auth.style.display = 'none';
        views.app.style.display = 'flex';
    } else {
        views.loader.style.display = 'none';
        views.auth.style.display = 'flex';
        views.app.style.display = 'none';
    }
});

// تسجيل دخول جوجل
window.loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        alert("فشل الدخول: " + error.message);
    }
};

// تسجيل دخول ايميل
document.getElementById('email-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        document.getElementById('auth-error').innerText = "بيانات الدخول غير صحيحة";
    }
});

window.logout = () => signOut(auth);

// ================= UI SETUP & NAVIGATION =================
function setupUI(user) {
    document.getElementById('header-avatar').src = user.photo || `https://ui-avatars.com/api/?name=${user.name}`;
    document.getElementById('sidebar-name').innerText = user.name;
    document.getElementById('sidebar-role').innerText = user.role === 'admin' ? 'مدير النظام' : 'طالب';
    document.getElementById('dash-name').innerText = user.name.split(' ')[0];
    document.getElementById('stat-xp').innerText = user.xp || 0;

    // إخفاء/إظهار الروابط حسب الدور
    if (user.role === 'student') {
        document.querySelector('.admin-links').style.display = 'none';
        document.querySelector('.student-links').style.display = 'block';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    } else {
        document.querySelector('.admin-links').style.display = 'block';
        document.querySelector('.student-links').style.display = 'none';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    }

    loadWallPosts();
}

window.navigate = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // إغلاق القائمة في الجوال عند الاختيار
    closeSidebarOnMobile();
};

// Mobile Sidebar Logic
window.toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('open');
};

window.closeSidebarOnMobile = () => {
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('open');
    }
};

// ================= SCHOOL WALL (المنشورات) =================
function loadWallPosts() {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        const feed = document.getElementById('wall-feed');
        feed.innerHTML = "";
        
        snapshot.forEach(doc => {
            const post = doc.data();
            const date = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleDateString('ar-EG') : 'الآن';
            const isLiked = post.likes && post.likes.includes(auth.currentUser.uid);
            
            feed.innerHTML += `
                <div class="post-card">
                    <div class="post-header">
                        <img src="https://ui-avatars.com/api/?name=${post.author}" class="post-avatar">
                        <div class="post-meta">
                            <h4>${post.author} <span class="role-badge" style="font-size:0.7rem">${post.role === 'admin' ? 'إدارة' : 'معلم'}</span></h4>
                            <span>${date}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <h3>${post.title}</h3>
                        <p>${post.content}</p>
                    </div>
                    <div class="post-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${doc.id}')">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${post.likes ? post.likes.length : 0} إعجاب
                        </button>
                    </div>
                </div>
            `;
        });
    });
}

window.publishPost = async () => {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    
    if(!title || !content) return alert("اكتب شيئاً!");

    await addDoc(collection(db, "posts"), {
        title, content,
        author: currentUserData.name,
        role: currentUserData.role,
        timestamp: new Date(),
        likes: []
    });
    
    window.closeModal('post-modal');
    document.getElementById('post-title').value = "";
    document.getElementById('post-content').value = "";
};

window.toggleLike = async (postId) => {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    const uid = auth.currentUser.uid;
    
    if (postSnap.data().likes && postSnap.data().likes.includes(uid)) {
        await updateDoc(postRef, { likes: arrayRemove(uid) });
    } else {
        await updateDoc(postRef, { likes: arrayUnion(uid) });
    }
};

// ================= UTILS & MODALS =================
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.toggleSignup = () => {
    // تبديل بسيط للنص (المنطق الحقيقي يتطلب دالة createAccount)
    alert("للتسجيل الجديد، يفضل استخدام زر Google للدخول السريع!");
};
