import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";


const loginForm = document.getElementById('loginForm');
const togglePassword = document.querySelector('.password-toggle');
const passwordInput = document.querySelector('#password');

// Toggle Password Visibility
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Toggle the eye icon
    const icon = this.querySelector('#toggleIcon');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

// Handle Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // CRITICAL: Check if email is verified
            if (!user.emailVerified) {
                alert("Please verify your email address before logging in. Check your inbox for the verification link.");
                // Optional: Sign them out immediately so they aren't "logged in" in an unverified state
                auth.signOut(); 
                return;
            }

            console.log("Logged in as:", user.email);
            alert("Login Successful!");
            window.location.href = "applicant.html"; 
        })
        .catch((error) => {
            alert("Error: " + error.message);
        });
});

document.getElementById('forgotPass').addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value || prompt("Please enter your email address:");
    
    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => alert("Password reset link sent to: " + email))
            .catch((error) => alert("Error: " + error.message));
    }
});


