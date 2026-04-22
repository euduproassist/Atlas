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
                const newPin = Math.floor(100000 + Math.random() * 900000).toString();
                await updateDoc(doc(db, "users", user.uid), { verificationPin: newPin });
                await addDoc(collection(db, "mail"), {
                    to: user.email,
                    from: "Atlas Admissions <eduproassist44@gmail.com>",
                message: {
                subject: "Verify Your Account - Student Application Portal",
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; border-top: 5px solid #4a90e2;">
                        <div style="text-align: center; color: #4a90e2; margin-bottom: 25px;">
                            <i class="fas fa-graduation-cap" style="font-size: 40px;"></i>
                            <h2 style="margin-top: 10px; color: #333;">Complete Verification</h2>
                        </div>
                        <p style="color: #333;">Hello,</p>
                        <p style="color: #555; line-height: 1.6;">Please use the code below to verify your account and complete your login:</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <h1 style="font-size: 48px; letter-spacing: 10px; color: #4a90e2; background: #f4f7f9; padding: 20px; border-radius: 8px; display: inline-block;">${newPin}</h1>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #555;">Regards,<br><strong>Atlas Admissions Team</strong></p>
                    </div>`
            }
                });

                // Updated Logic: Stay on login page and show modal
                window.pendingUser = { uid: user.uid, correctPin: newPin };
                document.getElementById('pinModal').style.display = 'flex';
            
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

document.getElementById('verifyPinBtn').addEventListener('click', async () => {
    const enteredPin = document.getElementById('inputPin').value;
    if (!window.pendingUser) return;

    const { uid, correctPin } = window.pendingUser;

    if (enteredPin === correctPin) {
        try {
            await updateDoc(doc(db, "users", uid), { isVerified: true });

        } catch (error) {
            alert("Error: " + error.message);
        }
    } else {
        alert("Incorrect PIN. Please try again.");
    }
});

document.getElementById('resendPinBtn').addEventListener('click', async () => {
    if (!window.pendingUser) return;
    const { uid } = window.pendingUser;
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        await updateDoc(doc(db, "users", uid), { verificationPin: newPin });
        await addDoc(collection(db, "mail"), {
            to: document.getElementById('email').value,
            from: "Atlas Admissions <eduproassist44@gmail.com>",
            message: {
                subject: "New Verification Code",
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; border-top: 5px solid #4a90e2;">
                        <div style="text-align: center; color: #4a90e2; margin-bottom: 25px;">
                            <i class="fas fa-graduation-cap" style="font-size: 40px;"></i>
                            <h2 style="margin-top: 10px; color: #333;">New Verification Code</h2>
                        </div>
                        <p style="color: #333;">Hello,</p>
                        <p style="color: #555; line-height: 1.6;">You requested a new PIN to verify your account. Please use the code below:</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <h1 style="font-size: 48px; letter-spacing: 10px; color: #4a90e2; background: #f4f7f9; padding: 20px; border-radius: 8px; display: inline-block;">${newPin}</h1>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #555;">Regards,<br><strong style="color: #333;">Atlas Admissions Team</strong></p>
                    </div>`
            }
        });
        window.pendingUser.correctPin = newPin; // Sync new pin for verification
        alert("A new PIN has been sent to your email.");
    } catch (e) {
        console.error(e);
    }
});
