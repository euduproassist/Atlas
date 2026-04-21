import { auth, db } from './firebase-config.js'; // FIXED: Added db import
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js"; // FIXED: Added direct imports

const loginForm = document.getElementById('loginForm');
const togglePassword = document.querySelector('.password-toggle');
const passwordInput = document.querySelector('#password');

// Toggle Password Visibility
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const icon = this.querySelector('#toggleIcon');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
});

// Handle Login
loginForm.addEventListener('submit', async (e) => { // FIXED: Added async here
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch the user document from Firestore to check custom verification
        const userDoc = await getDoc(doc(db, "users", user.uid));

                // Check if document exists and if isVerified is true
        if (!userDoc.exists() || userDoc.data().isVerified !== true) {
            if (confirm("Your account is not verified. Would you like us to send a new PIN?")) {
                const newPin = Math.floor(100000 + Math.random() * 900000).toString();
                await updateDoc(doc(db, "users", user.uid), { verificationPin: newPin });
                await addDoc(collection(db, "mail"), {
                    to: user.email,
                    from: "Atlas Admissions <eduproassist44@gmail.com>",
                    message: { subject: "Your Verification PIN", html: `<h1>${newPin}</h1>` }
                });
                alert("PIN sent! Please enter it on the registration page.");
                window.location.href = "register.html";
            }
            await signOut(auth);
            return;
        }

        console.log("Logged in as:", user.email);
        alert("Login Successful!");
        window.location.href = "applicant.html"; 

    } catch (error) {
        alert("Error: " + error.message);
    }
});

// Forgot Password
document.getElementById('forgotPass').addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value || prompt("Please enter your email address:");
    
    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => alert("Password reset link sent to: " + email))
            .catch((error) => alert("Error: " + error.message));
    }
});



