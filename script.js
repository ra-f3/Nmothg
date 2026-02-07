// استدعاء المكتبات
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// إعدادات المشروع (shagsu)
const firebaseConfig = {
  apiKey: "AIzaSyDEecBUfiZlgYZZRnt4IoUfRRCBTRwOpjc",
  authDomain: "shagsu-e847b.firebaseapp.com",
  projectId: "shagsu-e847b",
  storageBucket: "shagsu-e847b.firebasestorage.app",
  messagingSenderId: "194121088471",
  appId: "1:194121088471:web:9157152e8e724a903e9f92",
  measurementId: "G-BGH2TX47WB"
};

// تهيئة الخدمات
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// المتغيرات
let currentRole = 'admin'; // admin or student
let isLoginMode = true;

// عناصر DOM
const views = {
    loader: document.getElementById('loader'),
    auth: document.getElementById('auth-view'),
    admin: document.getElementById('admin-view'),
    student: document.getElementById('student-view')
};

// 1. إدارة تسجيل الدخول وتوجيه المستخدم
onAuthStateChanged(auth, (user) => {
    views.loader.style.display = 'none';
    if (user) {
        views.auth.style.display = 'none';
        // هنا في الواقع يجب حفظ دور المستخدم في قاعدة البيانات
        // لكن للتبسيط سنعتمد على اختيار المستخدم في شاشة الدخول
        const savedRole = localStorage.getItem('userRole') || 'student';
        if (savedRole === 'admin') {
            views.admin.style.display = 'block';
            loadAdminData();
        } else {
            views.student.style.display = 'block';
            loadStudentData();
        }
    } else {
        views.auth.style.display = 'flex';
        views.admin.style.display = 'none';
        views.student.style.display = 'none';
    }
});

// وظائف التبديل في شاشة الدخول
window.setRole = (role) => {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
};

window.toggleSignup = () => {
    isLoginMode = !isLoginMode;
    const btn = document.getElementById('login-btn');
    const link = document.getElementById('signup-link');
    if (isLoginMode) {
        btn.innerText = "دخول";
        link.innerText = "إنشاء حساب جديد";
    } else {
        btn.innerText = "تسجيل حساب جديد";
        link.innerText = "لديك حساب؟ تسجيل دخول";
    }
};

// عملية الدخول/التسجيل
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
        localStorage.setItem('userRole', currentRole); // حفظ الدور
    } catch (error) {
        msg.style.display = 'block';
        msg.className = 'alert alert-error';
        msg.innerText = "خطأ: " + error.message;
    }
});

window.logout = () => {
    localStorage.removeItem('userRole');
    signOut(auth);
};

// ==========================================
// 2. وظائف المدير (Admin Functions)
// ==========================================

// التبديل بين التبويبات
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
};

function loadAdminData() {
    // جلب الإجازات المرضية (Realtime)
    const leavesQuery = query(collection(db, "sick_leaves"), orderBy("timestamp", "desc"));
    onSnapshot(leavesQuery, (snapshot) => {
        const list = document.getElementById('leaves-list');
        list.innerHTML = "";
        document.getElementById('leave-count').innerText = snapshot.size;

        if(snapshot.empty) {
            list.innerHTML = "<tr><td colspan='6' style='text-align:center'>لا توجد طلبات إجازة جديدة</td></tr>";
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('ar-EG') : '-';
            
            const row = `
                <tr>
                    <td>${data.studentName}</td>
                    <td>${data.studentID}</td>
                    <td>${data.studentClass}</td>
                    <td>${date}</td>
                    <td><a href="${data.fileURL}" target="_blank" class="btn btn-secondary small">عرض PDF</a></td>
                    <td class="no-print">
                        <button onclick="deleteLeave('${doc.id}')" class="btn btn-danger small">حذف</button>
                    </td>
                </tr>
            `;
            list.innerHTML += row;
        });
    });

    // جلب عدد الطلاب
    onSnapshot(collection(db, "students"), (snap) => {
        document.getElementById('student-count').innerText = snap.size;
    });
}

// إضافة طالب
window.addStudent = async () => {
    const name = document.getElementById('std-name').value;
    const id = document.getElementById('std-id').value;
    const grade = document.getElementById('std-class').value;
    
    if(!name || !id) return alert("البيانات ناقصة");

    try {
        await addDoc(collection(db, "students"), {
            name, id, grade, createdAt: new Date()
        });
        alert("تم إضافة الطالب بنجاح");
        document.getElementById('std-name').value = "";
    } catch (e) { alert(e.message); }
};

// حذف طلب إجازة
window.deleteLeave = async (id) => {
    if(confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
        await deleteDoc(doc(db, "sick_leaves", id));
    }
};

// إضافة واجب
window.addAssignment = async () => {
    const text = document.getElementById('assign-text').value;
    if(!text) return;
    await addDoc(collection(db, "assignments"), {
        text, date: new Date().toLocaleDateString('ar-EG'), timestamp: new Date()
    });
    alert("تم نشر الواجب");
    document.getElementById('assign-text').value = "";
};

// ==========================================
// 3. وظائف الطالب (Student Functions)
// ==========================================

function loadStudentData() {
    // عرض الواجبات
    const q = query(collection(db, "assignments"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
        const ul = document.getElementById('student-assignments-list');
        ul.innerHTML = "";
        snap.forEach(doc => {
            ul.innerHTML += `<li>${doc.data().text} <small>(${doc.data().date})</small></li>`;
        });
    });
}

// رفع الإجازة المرضية (PDF)
window.uploadSickLeave = async () => {
    const name = document.getElementById('s-name').value;
    const id = document.getElementById('s-id').value;
    const grade = document.getElementById('s-class').value;
    const fileInput = document.getElementById('s-file');
    const file = fileInput.files[0];
    const btn = document.getElementById('upload-btn');
    const progressDiv = document.getElementById('upload-progress');

    if (!name || !id || !file) return alert("الرجاء تعبئة جميع البيانات واختيار ملف");
    if (file.type !== "application/pdf") return alert("يجب أن يكون الملف بصيغة PDF فقط");

    btn.disabled = true;
    btn.innerText = "جاري الرفع...";
    progressDiv.innerText = "0%";

    try {
        // 1. رفع الملف إلى Storage
        // ننشئ اسماً فريداً للملف
        const storageRef = ref(storage, 'sick_leaves/' + id + '_' + Date.now() + '.pdf');
        const snapshot = await uploadBytes(storageRef, file);
        progressDiv.innerText = "تم رفع الملف، جاري حفظ البيانات...";
        
        // 2. الحصول على رابط التحميل
        const downloadURL = await getDownloadURL(snapshot.ref);

        // 3. حفظ البيانات في Firestore
        await addDoc(collection(db, "sick_leaves"), {
            studentName: name,
            studentID: id,
            studentClass: grade,
            fileURL: downloadURL,
            timestamp: new Date()
        });

        alert("تم إرسال الإجازة المرضية للمدير بنجاح! ✅");
        // تفريغ الحقول
        document.getElementById('s-name').value = "";
        document.getElementById('s-id').value = "";
        fileInput.value = "";
        progressDiv.innerText = "";

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الرفع: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "رفع الطلب للمدير";
    }
};

// ربط الدوال بالنافذة (للعمل مع type=module)
window.showTab = window.showTab;
window.setRole = window.setRole;
window.toggleSignup = window.toggleSignup;
window.logout = window.logout;
window.addStudent = window.addStudent;
window.deleteLeave = window.deleteLeave;
window.addAssignment = window.addAssignment;
window.uploadSickLeave = window.uploadSickLeave;
