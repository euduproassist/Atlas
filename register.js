import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, collection, addDoc, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const registerForm = document.getElementById('registerForm');
const togglePassword = document.querySelector('.password-toggle');
const passwordInput = document.querySelector('#regPassword');

togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    document.getElementById('toggleIcon').classList.toggle('fa-eye');
    document.getElementById('toggleIcon').classList.toggle('fa-eye-slash');
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('fullName').value;

    try {
        // 1. Create the Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. GENERATE THE PIN FIRST (So we can use it in steps 3 and 4)
        const verificationPin = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Save additional info to Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            role: "student",
            createdAt: new Date(),
            verificationPin: verificationPin,
            isVerified: false,
            lastVerifiedAt: null
        });

        // 4. SEND THE EMAIL VIA FIRESTORE EXTENSION
        await addDoc(collection(db, "mail"), {
            to: email,
            from: "Atlas Admissions <eduproassist44@gmail.com>",
            message: {
                subject: "Verify Your Account - Student Application Portal",
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; border-top: 5px solid #4a90e2;">
                        <div style="text-align: center; color: #4a90e2; margin-bottom: 25px;">
                            <i class="fas fa-graduation-cap" style="font-size: 40px;"></i>
                            <h2 style="margin-top: 10px; color: #333;">Welcome to the Portal</h2>
                        </div>
                        <p style="color: #333;">Hi <strong>${fullName}</strong>,</p>
                        <p style="color: #555; line-height: 1.6;">Thank you for registering. Use the 6-digit code below to verify your email address:</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <h1 style="font-size: 48px; letter-spacing: 10px; color: #4a90e2; background: #f4f7f9; padding: 20px; border-radius: 8px; display: inline-block;">${verificationPin}</h1>
                        </div>
                        <p style="font-size: 0.85rem; color: #888; text-align: center;">Enter this code in the registration window to complete your setup.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #555;">Regards,<br><strong style="color: #333;">Atlas Admissions Team</strong></p>
                    </div>`
            }
        });

        // 5. SHOW THE MODAL
        document.getElementById('pinModal').style.display = 'flex';

        // 6. STORE DATA FOR THE VERIFY BUTTON
                window.pendingUser = {
            uid: user.uid,
            correctPin: verificationPin
        };

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            const email = document.getElementById('regEmail').value;
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
            if (userData.isVerified === false) {
                    alert("Account exists but is not verified. Redirecting to Login to complete verification.");
                    window.location.href = "login.html";
                    return;
                }                
            }
        }
        alert("Error: " + error.message);
    }
});

// VERIFICATION BUTTON LOGIC
document.getElementById('verifyPinBtn').addEventListener('click', async () => {
    const enteredPin = document.getElementById('inputPin').value;
    
    if (!window.pendingUser) {
        alert("Session expired. Please refresh and try again.");
        return;
    }

    const { uid, correctPin } = window.pendingUser;

        } catch (error) {
            alert("Error updating verification: " + error.message);
        }
    } else {
        alert("Incorrect PIN. Please check your email and try again.");
    }
});

document.getElementById('resendPinBtn').addEventListener('click', async () => {
    if (!window.pendingUser) return;
    const { uid } = window.pendingUser;
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        await updateDoc(doc(db, "users", uid), { verificationPin: newPin });
        await addDoc(collection(db, "mail"), {
            to: document.getElementById('regEmail')?.value || document.getElementById('email').value,
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

