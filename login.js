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
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        // 1. Check if user exists in Database
        if (!userDoc.exists()) {
            alert("No account found in database. Redirecting to Register.");
            await signOut(auth);
            window.location.href = "register.html";
            return;
        }

        const userData = userDoc.data();
        let needsVerification = false;

        // 2. Check if never verified
        if (userData.isVerified !== true) {
            needsVerification = true;
        } else if (userData.lastVerifiedAt) {
            // 3. Check 14-day rule (14 days in milliseconds: 1209600000)
            const lastVerified = userData.lastVerifiedAt.toDate().getTime();
            const now = new Date().getTime();
            if (now - lastVerified > 1209600000) {
                needsVerification = true;
            }
        }

        if (needsVerification) {
            const newPin = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Update Firestore first
            await updateDoc(userDocRef, { 
                verificationPin: newPin, 
                isVerified: false // Reset to false for the 14-day re-verification
            });

            // Send Mail
            await addDoc(collection(db, "mail"), {
                to: user.email,
                from: "Atlas Admissions <eduproassist44@gmail.com>",
                message: {
                    subject: "Security Verification - Student Portal",
                    html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; border-top: 5px solid #4a90e2;">
                            <div style="text-align: center; color: #4a90e2; margin-bottom: 25px;">
                                <i class="fas fa-graduation-cap" style="font-size: 40px;"></i>
                                <h2 style="margin-top: 10px; color: #333;">Verification Required</h2>
                            </div>
                            <p style="color: #333;">Hello,</p>
                            <p style="color: #555; line-height: 1.6;">For your security, please verify your account using the code below:</p>
                            <div style="text-align: center; margin: 35px 0;">
                                <h1 style="font-size: 48px; letter-spacing: 10px; color: #4a90e2; background: #f4f7f9; padding: 20px; border-radius: 8px; display: inline-block;">${newPin}</h1>
                            </div>
                            <p style="font-size: 0.8rem; color: #888; text-align: center;">Note: Verification is required every 14 days.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                            <p style="color: #555;">Regards,<br><strong>Atlas Admissions Team</strong></p>
                        </div>`
                }
            });

            window.pendingUser = { uid: user.uid, correctPin: newPin };
            document.getElementById('pinModal').style.display = 'flex';
            await signOut(auth);
            return;
        }

        alert("Login Successful!");
        window.location.href = "applicant.html"; 

        } catch (error) {
        console.error("Atlas Login Error:", error);
        if (error.code === 'auth/user-not-found') {
            alert("No user found. Redirecting to Register.");
            window.location.href = "register.html";
        } else {
            alert("Error: " + error.message);
        }
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
            alert("Verification Successful! Please log in now.");
            location.reload(); 

            } catch (error) {
            console.error("Atlas PIN Verification Error:", error);
            alert("Error updating verification: " + error.message);
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

});
