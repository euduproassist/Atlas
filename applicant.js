import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const loader = document.getElementById('loader');
const userNameDisplay = document.getElementById('userNameDisplay');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');

// Monitor Authentication State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, check if verified
        if (!user.emailVerified) {
            alert("Email not verified. Redirecting to login.");
            window.location.href = "index.html";
            return;
        }

        try {
            // Fetch User Data from Firestore (R0 usage: 1 Read)
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                const firstName = data.fullName.split(' ')[0]; // Pick first name for header
                
                userNameDisplay.textContent = firstName;
                welcomeText.textContent = `Welcome, ${firstName}!`;
            }
            
            // Hide Loader
            loader.style.display = 'none';

        } catch (error) {
            console.error("Error fetching user data:", error);
            loader.style.display = 'none';
        }
    } else {
        // No user logged in, kick them out
        window.location.href = "index.html";
    }
});

// New Modern Profile Card UI
const triggerProfileActions = async () => {
    const user = auth.currentUser;
    const modal = document.getElementById('statusModal');
    const body = document.getElementById('statusModalBody');
    
    // Fetch latest user data for the card
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    body.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="width: 80px; height: 80px; background: #e3f2fd; color: #4a90e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; font-size: 2rem;">
                <i class="fas fa-user"></i>
            </div>
            <h2 style="margin-bottom: 5px;">${userData.fullName}</h2>
            <p style="color: #666; margin-bottom: 25px;">${user.email}</p>
            
            <div style="display: flex; flex-direction: column; gap: 10px; max-width: 300px; margin: 0 auto;">
                <button id="modalChangePass" style="padding: 12px; background: white; border: 1px solid #4a90e2; color: #4a90e2; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-key"></i> Change Password
                </button>
                <button id="modalLogout" style="padding: 12px; background: #ff4d4d; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    // Button Logic inside the Card
    document.getElementById('modalChangePass').onclick = () => {
        sendPasswordResetEmail(auth, user.email).then(() => alert("Reset link sent to " + user.email));
    };
    document.getElementById('modalLogout').onclick = () => {
        if(confirm("Log out now?")) signOut(auth).then(() => window.location.href = "index.html");
    };
};

// Re-bind the listeners to the new function
logoutBtn.onclick = (e) => { e.stopPropagation(); triggerProfileActions(); };
document.getElementById('updateProfileBtn').onclick = (e) => { e.preventDefault(); triggerProfileActions(); };

// Function to show the Tracking Modal
document.getElementById('trackStatusBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const modal = document.getElementById('statusModal');
    const body = document.getElementById('statusModalBody');

    // Show loading state
    body.innerHTML = "<p style='text-align:center;'>Fetching status...</p>";
    modal.style.display = 'flex';

    try {
        // Fetch the application data (Synced with Staff Portal updates)
        const appSnap = await getDoc(doc(db, "applications", user.uid));
        
        if (!appSnap.exists()) {
            body.innerHTML = "<p style='text-align:center; color: #666;'>No application found. Please complete Step 1 to 4 first.</p>";
            return;
        }

        const data = appSnap.data();
        const s1 = data.step1 || {};
        const s2 = data.step2 || {};
        
        // --- LOGIC: Handle 2nd Choice Status based on 1st Choice ---
        const firstChoiceStatus = data.status || "Pending";
        let secondChoiceStatusDisplay = "";
        
        if (firstChoiceStatus.toLowerCase() === "rejected") {
            // If 1st choice is rejected, 2nd choice becomes active (Under Review)
            secondChoiceStatusDisplay = "UNDER REVIEW";
        } else if (firstChoiceStatus.toLowerCase().includes("accepted")) {
            // If 1st choice is accepted, 2nd choice is effectively on hold/not reviewed
            secondChoiceStatusDisplay = "N/A (1ST CHOICE ACCEPTED)";
        } else {
            // Default: 1st choice is still pending or in review
            secondChoiceStatusDisplay = "PENDING 1ST CHOICE OUTCOME";
        }

        // --- UI Construction ---
        body.innerHTML = `
            <div style="display: flex; gap: 40px; margin-bottom: 30px;">
                <div>
                    <span style="color: #888; font-size: 0.85rem;">Application ID:</span>
                    <strong style="display: block;">APP-${user.uid.substring(0, 5).toUpperCase()}</strong>
                </div>
                <div>
                    <span style="color: #888; font-size: 0.85rem;">Name:</span>
                    <strong style="display: block;">${s1.fullNames} ${s1.surname}</strong>
                </div>
                <div>
                    <span style="color: #888; font-size: 0.85rem;">Overall Status:</span>
                    <span style="display: block; background: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-top: 5px;">
                        ${firstChoiceStatus.toUpperCase()}
                    </span>
                </div>
            </div>

            <div style="width: 100%; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee; color: #1976d2; font-size: 0.75rem; text-transform: uppercase;">
                        <th style="padding: 10px;">Year</th>
                        <th style="padding: 10px;">Programme Choice</th>
                        <th style="padding: 10px;">Qualification</th>
                        <th style="padding: 10px;">Campus</th>
                        <th style="padding: 10px;">Documents</th>
                    </tr>
                </thead>
                <tbody style="font-size: 0.9rem;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 15px 10px;">${s2.acadYear || '2027'}</td>
                        <td style="padding: 15px 10px;">1st Choice</td>
                        <td style="padding: 15px 10px;">${s2.choice1}</td>
                        <td style="padding: 15px 10px;">${s2.campus}</td>
                        <td style="padding: 15px 10px;">
                            ${data.adminDocs ? `<a href="${data.adminDocs.acceptanceLetter}" target="_blank" style="color:#4a90e2;">View Letter</a>` : 'N/A'}
                        </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 15px 10px;">${s2.acadYear || '2027'}</td>
                        <td style="padding: 15px 10px;">2nd Choice</td>
                        <td style="padding: 15px 10px;">${s2.choice2 || 'None'}</td>
                        <td style="padding: 15px 10px;">${s2.campus}</td>
                        <td style="padding: 15px 10px; color: #999; font-style: italic;">
                            ${secondChoiceStatusDisplay}
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

    } catch (error) {
        console.error("Tracking Error:", error);
        body.innerHTML = "<p style='text-align:center; color: red;'>Error loading data. Please try again.</p>";
    }
});

let currentZoom = 1.0;

window.changeZoom = function(amount) {
    const body = document.getElementById('statusModalBody');
    currentZoom += amount;
    
    // Limits: Don't let it get too small or too huge
    if (currentZoom < 0.5) currentZoom = 0.5;
    if (currentZoom > 1.5) currentZoom = 1.5;
    
    body.style.transform = `scale(${currentZoom})`;
};

// Contact Support Modal for TUT Arcadia
document.querySelector('a.q-link[href="#"]:nth-child(2)').addEventListener('click', (e) => {
    e.preventDefault();
    const modal = document.getElementById('statusModal');
    const body = document.getElementById('statusModalBody');

    body.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="margin-bottom: 20px;">
                <i class="fas fa-graduation-cap" style="font-size: 2rem; color: #4a90e2;"></i>
                <i class="fas fa-headset" style="font-size: 1.5rem; color: #556080; margin-left: -10px;"></i>
                <h2 style="margin-top: 10px; color: #333;">Student Support</h2>
                <p style="color: #666;">TUT Arcadia Campus Admissions & Technical Help</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left;">
                <!-- Admissions Support -->
                <div style="padding: 15px; border: 1px solid #eef0f5; border-radius: 8px; background: #fff;">
                    <h4 style="color: #4a90e2; margin-bottom: 8px;"><i class="fas fa-university"></i> Admissions</h4>
                    <p style="font-size: 0.85rem; color: #777; margin-bottom: 10px;">Course info, status updates, and academic requirements.</p>
                    <a href="mailto:arcadiaadmissions@tut.ac.za" style="color: #333; font-weight: 600; text-decoration: none; font-size: 0.9rem;">arcadiaadmissions@tut.ac.za</a>
                </div>

                <!-- Document Vault Help -->
                <div style="padding: 15px; border: 1px solid #eef0f5; border-radius: 8px; background: #fff;">
                    <h4 style="color: #4a90e2; margin-bottom: 8px;"><i class="fas fa-file-invoice"></i> Vault Support</h4>
                    <p style="font-size: 0.85rem; color: #777; margin-bottom: 10px;">Issues with uploading IDs, certificates, or file sizes.</p>
                    <a href="mailto:arcadiasupport@tut.ac.za" style="color: #333; font-weight: 600; text-decoration: none; font-size: 0.9rem;">arcadiasupport@tut.ac.za</a>
                </div>

                <!-- Technical Assistance -->
                <div style="padding: 15px; border: 1px solid #eef0f5; border-radius: 8px; background: #fff;">
                    <h4 style="color: #4a90e2; margin-bottom: 8px;"><i class="fas fa-tools"></i> System Help</h4>
                    <p style="font-size: 0.85rem; color: #777; margin-bottom: 10px;">Login issues, password resets, or portal bugs.</p>
                    <button onclick="window.location.href='mailto:techsupport@tut.ac.za'" style="background: none; border: none; color: #4a90e2; font-weight: 600; cursor: pointer; padding: 0;">Report a Bug →</button>
                </div>

                <!-- Instant Help -->
                <div style="padding: 15px; border: 1px solid #25D366; border-radius: 8px; background: #f0fdf4;">
                    <h4 style="color: #25D366; margin-bottom: 8px;"><i class="fab fa-whatsapp"></i> Instant Chat</h4>
                    <p style="font-size: 0.85rem; color: #777; margin-bottom: 10px;">Quick chat with an advisor during office hours.</p>
                    <a href="https://wa.me/27123825911" target="_blank" style="color: #128C7E; font-weight: 700; text-decoration: none;">Chat via WhatsApp</a>
                </div>
            </div>

            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; font-size: 0.8rem; color: #999;">
                <p><i class="fas fa-clock"></i> Office Hours: Mon - Fri (08:00 - 15:30)</p>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
});

// --- STUDENT PORTAL MASTER GUIDELINE DATA ---
const guideSections = [
    {
        title: "1. Introduction to the Unified Student Portal",
        content: "Welcome to the official Student Application Portal. This system is designed as a high-efficiency, R0-cost architecture powered by Firebase. It combines a dynamic multi-step application form with a secure Document Vault. The portal ensures that your data is never lost, even if your internet disconnects, using our proprietary 'Silent Cloud Sync' technology."
    },
    {
        title: "2. The Authentication & Security Layer",
        content: "Your security is our priority. The portal uses Firebase Authentication. Users must verify their email addresses before accessing the dashboard. If you attempt to log in without verification, the system will automatically redirect you. You can manage your security via the Profile Card, where you can trigger a Password Reset Email directly to your inbox."
    },
    {
        title: "3. Understanding 'Silent Cloud Sync'",
        content: "Unlike traditional forms where you lose data if you refresh, this portal saves every keystroke. We have implemented a 2-second 'Debounce' timer. When you stop typing for 2000ms, the system automatically pushes your progress to the 'drafts' collection in Firestore. This ensures a seamless experience across different devices."
    },
    {
        title: "4. Step 1: Personal & Demographic Information",
        content: "In this section, you must provide your legal identity details. Note: Our system has been updated to no longer store sensitive ID or Phone numbers permanently until final submission for your privacy. You must specify your nationality; selecting 'Other' will dynamically generate an additional input field for country specification."
    },
    {
        title: "5. Disability & Support Requirements",
        content: "We are committed to inclusivity. If you indicate a disability, the system expands to allow up to three specific declarations. Use the 'Add' buttons to reveal additional input rows. This data is used to ensure the campus can provide the necessary physical or academic support upon your arrival."
    },
    {
        title: "6. Step 2: Academic History & Matriculation",
        content: "You are required to select your matriculation year and examination body. If your exam body is not listed, select 'Other' to provide manual details. The system uses a 'Populate' loop to generate years ranging from 50 years ago to 10 years into the future, ensuring all applicants are covered."
    },
    {
        title: "7. The Dynamic Subject & APS Tracker",
        content: "The Subject Marks section is completely dynamic. You must enter your subject name, percentage, and level. The system will only allow you to add a new row once the current row is fully completed. This ensures data integrity. Your APS (Admission Point Score) is calculated based on these entries."
    },
    {
        title: "8. Post-School Qualifications (Advanced)",
        content: "For transfer students or post-graduates, the Post-School section tracks previous institutional history. If you select 'Discontinued' as a status, the 'Year Completed' field will automatically disable, as the system logic understands no completion date exists for discontinued studies."
    },
    {
        title: "9. Programme Choices & Campus Selection",
        content: "You are allowed two choices. Your 1st choice is your primary goal. The system logic is programmed to only evaluate your 2nd choice if the 1st choice is 'Rejected' by the admissions office. You must also select your preferred campus (e.g., Arcadia) and your mode of attendance (Full-time/Part-time)."
    },
    {
        title: "10. Step 3: The Document Vault (Secure Uploads)",
        content: "The Document Vault utilizes Firebase Storage. You must upload clear PDF or Image scans of your ID, Matric results, and Proof of Payment. Once a file is successfully uploaded, the system marks it with a green 'Already Uploaded ✅' badge. This prevents redundant uploads and saves you data costs."
    },
    {
        title: "11. Step 4: Final Review & Submission",
        content: "The final step generates a 'Review Summary'. This is a read-only snapshot of your entire application. Before hitting 'Submit', ensure all details are correct. Upon submission, your 'Draft' is converted into a formal 'Application' document, and your status is set to 'Pending'."
    },
    {
        title: "12. Tracking Your Application Status",
        content: "On your dashboard, use the 'Track Status' button. This opens a real-time modal showing your Application ID and the specific status of both your 1st and 2nd choices. You can use the Zoom (+/-) buttons at the top of the tracker to adjust the text size for better readability on mobile devices."
    },
    {
        title: "13. Contacting Campus Support",
        content: "If you encounter technical bugs or academic queries, the 'Contact Support' link provides direct access to Arcadia Campus Admissions, Vault Technical Help, and a 24/7 WhatsApp Instant Chat link for quick resolutions during office hours (08:00 - 15:30)."
    },
    {
        title: "14. Troubleshooting Login Issues",
        content: "If the loader spins indefinitely, check your internet connection. The portal requires an active connection to Firebase. If you forget your password, use the 'Help Center' or the 'Update Profile' link to trigger a recovery email."
    },
    {
        title: "15. Final Declaration & Legalities",
        content: "By using this portal, you agree that the information provided is truthful. Fraudulent document uploads will lead to immediate disqualification and potential legal action. Your data is stored securely and handled according to institutional privacy policies."
    }
];

// --- LOGIC TO OPEN THE GUIDE ---
document.querySelector('a.q-link:last-child').addEventListener('click', (e) => {
    e.preventDefault();
    const overlay = document.getElementById('guideOverlay');
    const content = document.getElementById('guideScrollContent');

    // Generate the massive list of instructions
    content.innerHTML = guideSections.map(section => `
        <div style="margin-bottom: 50px;">
            <h2 style="color: #4a90e2; font-size: 1.4rem; margin-bottom: 15px; border-left: 4px solid #4a90e2; padding-left: 15px;">
                ${section.title}
            </h2>
            <p style="font-size: 1.05rem; line-height: 1.8; color: #444; text-align: justify;">
                ${section.content}
            </p>
        </div>
    `).join('');

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Stop background scroll
});

// --- CLOSE LOGIC ---
document.getElementById('closeGuide').onclick = () => {
    document.getElementById('guideOverlay').style.display = 'none';
    document.body.style.overflow = 'auto'; // Re-enable scroll
};


