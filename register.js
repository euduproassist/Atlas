import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const registerForm = document.getElementById('registerForm');
const togglePassword = document.querySelector('.password-toggle');
const passwordInput = document.querySelector('#regPassword');

// Password Visibility Toggle
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    document.getElementById('toggleIcon').classList.toggle('fa-eye');
    document.getElementById('toggleIcon').classList.toggle('fa-eye-slash');
});

// Handle Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phoneNumber').value;
    const idNumber = document.getElementById('idNumber').value;

    try {
        // 1. Create the Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Save additional info to Firestore "users" collection
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            phoneNumber: phone,
            idNumber: idNumber,
            createdAt: new Date()
        });

        alert("Account created successfully!");
        window.location.href = "index.html";
        
    } catch (error) {
        alert("Error: " + error.message);
    }
});

