import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

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

    const email = loginForm['email'].value;
    const password = loginForm['password'].value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Success
            const user = userCredential.user;
            console.log("Logged in as:", user.email);
            alert("Login Successful!");
            // window.location.href = "dashboard.html"; // Redirect to your portal
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert("Error: " + errorMessage);
        });
});
