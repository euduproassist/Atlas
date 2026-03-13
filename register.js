import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert("Account created successfully! You can now log in.");
            window.location.href = "index.html"; // Takes user back to login
        })
        .catch((error) => {
            alert("Registration Error: " + error.message);
        });
});
