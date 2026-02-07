import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);

// المتغيرات العامة
let currentRole = 'admin'; 
let isLoginMode = true;

// DOM Elements
const authView = document.getElementById('auth-view');
const mainApp = document.getElementById('main-app');
const loader = document.getElementById('loader');

// =======================
// 1. نظام المصادقة (Auth)
// =======================

onAuthStateChanged(auth, (user) => {
    loader.style.display = 'none';
    if (user) {
        authView.style.display = 'none';
        mainApp.style.display = 'flex';
        // استرجاع الدور المحفوظ
        currentRole = localStorage.getItem('role') || 'admin';
        setupUI(user);
    } else {
        authView.style.display = 'flex';
        mainApp.style.display = 'none';
    }
});

function setupUI(user) {
    document.getElementById('user-name').innerText = currentRole === 'admin' ? "المدير العام" : user.email.split('@')[0];
    
    // إخفاء عناصر المدير عن الطالب والعكس
    if (currentRole === 'student') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block'); // 'flex' if needed
        document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
        loadDashboardStats(); // تحميل الإحصائيات للمدير
        loadStudentsDropdown(); // تحميل قائمة الطلاب للرصد
    }
    
    // تحميل البيانات المشتركة
    loadAssignments();
    loadLeaves();
    loadStudentsTable();
}

window.setRole = (role) => currentRole = role;

window.toggleSignup = () => {
    isLoginMode = !isLoginMode;
    const btn = document.querySelector('.btn-login');
    const link = document.getElementById('signup-link');
    btn.innerHTML = isLoginMode ? 'تسجيل الدخول <i class="fas fa-arrow-left"></i>' : 'إنشاء حساب جديد <i class="fas fa-check"></i>';
    link.innerText = isLoginMode ? "تسجيل حساب جديد" : "لديك حساب؟ تسجيل دخول";
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-msg');

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        localStorage.setItem('role', currentRole);
    } catch (error) {
        msg.style.display = 'block';
        msg.className = 'alert alert-error';
        msg.innerText = "خطأ: " + error.message;
    }
});

window.logout = () => {
    localStorage.removeItem('role');
    signOut(auth);
};

// =======================
// 2. التنقل (Navigation)
// =======================

window.navigate = (pageId) => {
    // إخفاء كل الصفحات
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu-links li').forEach(el => el.classList.remove('active'));
    
    // إظهار الصفحة المطلوبة
    document.getElementById(`view-${pageId}`).classList.add('active');
    
    // تحديث العنوان والقائمة
    document.getElementById('page-title').innerText = event.currentTarget.querySelector('span').innerText;
    event.currentTarget.classList.add('active');
};

// =======================
// 3. إدارة البيانات (Data)
// =======================

// --- الطلاب ---
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.addNewStudent = async () => {
    const name = document.getElementById('new-std-name').value;
    const id = document.getElementById('new-std-id').value;
    const grade = document.getElementById('new-std-grade').value;

    if(!name) return alert("الاسم مطلوب");

    await addDoc(collection(db, "students"), {
        name, id, grade, createdAt: new Date()
    });
    alert("تم إضافة الطالب بنجاح");
    closeModal('student-modal');
};

function loadStudentsTable() {
    if(currentRole !== 'admin') return;
    onSnapshot(collection(db, "students"), (snap) => {
        const tbody = document.getElementById('students-table-body');
        tbody.innerHTML = "";
        document.getElementById('count-students').innerText = snap.size;
        
        snap.forEach(doc => {
            const d = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><i class="fas fa-user-graduate"></i> ${d.name}</td>
                    <td>${d.id}</td>
                    <td><span class="type-box" style="padding:2px 10px; font-size:0.8rem">${d.grade}</span></td>
                    <td style="color:var(--success)">نشط</td>
                    <td><button class="btn-action" style="background:var(--danger); padding:5px 10px" onclick="deleteItem('students', '${doc.id}')"><i class="fas fa-trash"></i></button></td>
                </tr>
            `;
        });
    });
}

function loadStudentsDropdown() {
    onSnapshot(collection(db, "students"), (snap) => {
        const select = document.getElementById('grade-student-select');
        select.innerHTML = "<option>اختر الطالب...</option>";
        snap.forEach(doc => {
            select.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`;
        });
    });
}

// --- الواجبات ---
window.postAssignment = async () => {
    const text = document.getElementById('assign-content').value;
    if(!text) return;
    await addDoc(collection(db, "assignments"), {
        text, 
        author: auth.currentUser.email,
        date: new Date().toLocaleDateString('ar-EG'),
        timestamp: new Date()
    });
    document.getElementById('assign-content').value = "";
    alert("تم النشر");
};

function loadAssignments() {
    const q = query(collection(db, "assignments"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        const container = document.getElementById('assignments-list');
        container.innerHTML = "";
        document.getElementById('count-assignments').innerText = snap.size;

        snap.forEach(doc => {
            const d = doc.data();
            container.innerHTML += `
                <div class="assign-card">
                    <h4><i class="fas fa-pen-square"></i> واجب جديد</h4>
                    <p>${d.text}</p>
                    <small style="color:#777; margin-top:10px; display:block"><i class="far fa-clock"></i> ${d.date}</small>
                </div>
            `;
        });
    });
}

// --- الإجازات المرضية ---
window.uploadLeave = async () => {
    const file = document.getElementById('leave-file').files[0];
    const name = document.getElementById('leave-name').value;
    const id = document.getElementById('leave-id').value;
    const statusDiv = document.getElementById('upload-status');

    if(!file || !name) return alert("البيانات ناقصة");

    statusDiv.innerText = "جاري رفع الملف...";
    
    try {
        const storageRef = ref(storage, 'leaves/' + Date.now() + '.pdf');
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, "leaves"), {
            studentName: name, studentID: id, fileURL: url, timestamp: new Date()
        });
        
        alert("تم الإرسال!");
        statusDiv.innerText = "";
    } catch (e) {
        alert("خطأ: " + e.message);
    }
};

function loadLeaves() {
    if(currentRole !== 'admin') return;
    const q = query(collection(db, "leaves"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        const tbody = document.querySelector('#leaves-admin-table tbody');
        tbody.innerHTML = "";
        document.getElementById('count-leaves').innerText = snap.size;

        snap.forEach(doc => {
            const d = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${d.studentName}</td>
                    <td>${d.studentID}</td>
                    <td>${new Date(d.timestamp.toDate()).toLocaleDateString('ar-EG')}</td>
                    <td><a href="${d.fileURL}" target="_blank" style="color:var(--accent)">عرض PDF</a></td>
                    <td><button onclick="deleteItem('leaves', '${doc.id}')" style="color:red; border:none; background:none"><i class="fas fa-times"></i> رفض</button></td>
                </tr>
            `;
        });
    });
}

// --- رصد الدرجات ---
window.saveGrade = async () => {
    const student = document.getElementById('grade-student-select').value;
    const subject = document.getElementById('grade-subject').value;
    const grade = document.getElementById('grade-value').value;
    
    if(student === "اختر الطالب..." || !grade) return alert("اختر الطالب وضع الدرجة");

    await addDoc(collection(db, "grades"), { student, subject, grade, timestamp: new Date() });
    
    // إضافة للجدول المصغر
    const tbody = document.querySelector('#grades-history-table tbody');
    tbody.innerHTML = `<tr><td>${student}</td><td>${subject}</td><td>${grade}</td></tr>` + tbody.innerHTML;
};

// وظائف عامة
window.deleteItem = async (col, id) => {
    if(confirm("هل أنت متأكد؟")) await deleteDoc(doc(db, col, id));
};

function loadDashboardStats() {
    // (يتم تعبئة الأرقام تلقائياً عبر دوال الجلب الأخرى)
}
