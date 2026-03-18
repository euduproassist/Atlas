import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
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

    try {
        // 1. Create the Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Save additional info to Firestore "users" collection
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            role: "admin";
            createdAt: new Date()
        });

        // 3. Send Verification Email (Costs R0 on Spark Plan)
        await sendEmailVerification(user);

        alert("Account created! Please check your email inbox and click the verification link before logging in.");
        window.location.href = "admin-login.html";
        
    } catch (error) {
        alert("Error: " + error.message);
    }
});

