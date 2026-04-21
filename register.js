import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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
            role: "student",
            createdAt: new Date()
        });

        // 3. Trigger Official Firebase Verification
        // This MUST be called to generate the secure token that prevents the "Invalid Page Mode" error.
        await sendEmailVerification(user, { 
            url: 'https://euduproassist.github.io/login.html' 
        });

        // 4. Send your branded "Welcome" email via Firestore
        // Note: We removed the undefined "verificationLink" variables so the code doesn't crash.
        await addDoc(collection(db, "mail"), {
            to: email,
            from: "Atlas Admissions <eduproassist44@gmail.com>",
            message: {
                subject: "Welcome to Atlas Independent School",
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px; border-top: 5px solid #4a90e2;">
                        <div style="text-align: center; color: #4a90e2; margin-bottom: 25px;">
                            <i class="fas fa-graduation-cap" style="font-size: 40px;"></i>
                            <h2 style="margin-top: 10px; color: #333;">Welcome to the Portal</h2>
                        </div>
                        <p style="color: #333;">Hi <strong>${fullName}</strong>,</p>
                        <p style="color: #555; line-height: 1.6;">Thank you for registering with Atlas Independent School.</p>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404;">
                            <p style="margin: 0; font-weight: bold;">ACTION REQUIRED:</p>
                            <p style="margin: 5px 0 0;">Check your inbox for a second email from <strong>noreply@atlas-c58f8.firebaseapp.com</strong>. It contains the secure verification link required to activate your account. You must click that link before you can log in.</p>
                        </div>

                        <p style="color: #555; line-height: 1.6;">Once verified, you can return to the portal to begin your application.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #555;">Regards,<br><strong style="color: #333;">Atlas Admissions Team</strong></p>
                    </div>`
            }
        });

        alert("Registration successful! We've sent two emails: one welcome email and one official verification link. Please click the verification link to activate your account.");
        window.location.href = "login.html";
        
    } catch (error) {
        alert("Error: " + error.message);
    }
});



