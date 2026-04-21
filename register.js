import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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

        // 2. Save additional info to Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            role: "student",
            createdAt: new Date()
            verificationPin: verificationPin,
            isVerified: false
        });

        // 3. GENERATE THE OFFICIAL SECURE LINK
        // We use your Firebase project's official handler to ensure it doesn't go to Spam
        const apiKey = auth.app.options.apiKey;
        const projectID = "atlas-c58f8"; // Your Project ID
        
        // This constructs the official code that Firebase Auth recognizes
        const verificationPin = Math.floor(100000 + Math.random() * 900000).toString();

        // 4. SEND THE ONE SINGLE BRANDED EMAIL
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
                        <p style="color: #555; line-height: 1.6;">Thank you for registering. Use the code below to verify your account:</p>
                        <div style="text-align: center; margin: 35px 0;">
                        <h1 style="font-size: 48px; letter-spacing: 10px; color: #4a90e2;">${verificationPin}</h1>
                        </div>
                        <p style="font-size: 0.85rem; color: #888;">If the button above does not work, copy and paste this secure link into your browser:</p>
                        <p style="font-size: 0.75rem; color: #4a90e2; word-break: break-all; background: #f4f7f9; padding: 10px; border-radius: 4px;">${verificationLink}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                        <p style="color: #555;">Regards,<br><strong style="color: #333;">Atlas Admissions Team</strong></p>
                    </div>`
            }
        });

        alert("Account created! One verification email has been sent to your inbox.");
        window.location.href = "login.html";
        
    } catch (error) {
        alert("Error: " + error.message);
    }
});




