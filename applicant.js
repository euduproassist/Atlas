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

const helpPages = [
    {
        title: "1. Introduction",
        content: "Welcome to the Student Application Portal. This guide will walk you through the secure application process for TUT Arcadia. Our system is designed with <strong>Real-Time Cloud Sync</strong>, meaning your progress is saved automatically as you type."
    },
    {
        title: "2. Secure Authentication",
        content: "To access the portal, you must be logged in. If you are a new user, ensure your email is verified. The system uses Firebase Auth to protect your identity. If you leave the page, you can log back in and pick up exactly where you left off."
    },
    {
        title: "3. The Dashboard",
        content: "The Dashboard is your command center. From here, you can: <br>• View your active application status.<br>• Upload missing documents to the Vault.<br>• Update your profile information.<br>• Access technical support via WhatsApp or Email."
    },
    {
        title: "4. Step 1: Personal Details",
        content: "Begin by entering your legal names and ID number. <strong>Note:</strong> If you select 'Other' under nationality, an additional input will appear for you to specify your home country. This ensures accurate record-keeping for international students."
    },
    {
        title: "5. Handling Disabilities",
        content: "We provide equal access. If you select 'Yes' for disability, the portal allows you to list up to three specific conditions. Use the 'Add' button to expand these fields as needed."
    },
    {
        title: "6. Automatic Cloud Syncing",
        content: "You will notice no 'Save' button. Our <strong>SyncFieldToCloud</strong> technology saves your data every 2 seconds after you stop typing. This prevents data loss during power outages or signal drops."
    },
    {
        title: "7. Step 2: Academic History",
        content: "In this section, you provide your Matric details. Select your examination body (e.g., IEB, NSC). If your body is not listed, select 'Other' to manually type it in."
    },
    {
        title: "8. Subject Results & APS",
        content: "Enter each subject, its percentage, and level. The system requires full details for each row before allowing you to add a new subject. This ensures your Admission Point Score (APS) is calculated correctly."
    },
    {
        title: "9. Post-School Qualifications",
        content: "If you have studied at another institution, enter those details here. If you discontinued a course, the 'Year Completed' field will automatically disable to prevent logic errors in your timeline."
    },
    {
        title: "10. Program Choices",
        content: "You are allowed two choices. Your 1st choice is the primary focus. If the 1st choice is rejected, our staff portal logic automatically activates your 2nd choice for review."
    },
    {
        title: "11. Step 3: The Document Vault",
        content: "Upload clear scans of your ID, Matric results, and Proof of Address. Once a file is successfully uploaded, the system marks it with a green checkmark (✅), and you won't need to re-upload it again."
    },
    {
        title: "12. Upload Limits",
        content: "Ensure files are in PDF or Image format and under 5MB. If an upload fails, check your internet connection and try again. The 'Please Wait' indicator means the files are being encrypted and moved to our secure storage."
    },
    {
        title: "13. Step 4: Final Review",
        content: "Before submission, the system generates a <strong>Review Summary</strong>. This is a snapshot of your Step 1 and Step 2 data. Check these details carefully; once submitted, certain fields may become locked."
    },
    {
        title: "14. Submitting the Application",
        content: "When you click 'Submit', the system migrates your 'Draft' to the 'Live Applications' database. You will receive a success alert, and your status will change to 'Pending'."
    },
    {
        title: "15. Tracking Status",
        content: "Use the 'Track Application' button on the dashboard. It opens a detailed table showing your Application ID (e.g., APP-XXXXX) and the status of both your 1st and 2nd choice programs."
    },
    {
        title: "16. Choice Outcomes",
        content: "If your 1st choice is 'Accepted', your 2nd choice will show as 'N/A'. If your 1st choice is 'Rejected', your 2nd choice automatically updates to 'Under Review'."
    },
    {
        title: "17. Profile Management",
        content: "Inside the Profile Card, you can trigger a <strong>Password Reset</strong>. A secure link will be sent to your registered email immediately via Firebase Services."
    },
    {
        title: "18. Zoom Controls",
        content: "For better accessibility, the Status Tracking window includes 'Zoom In' and 'Zoom Out' buttons. This allows you to view large data tables comfortably on any screen size."
    },
    {
        title: "19. Contacting Support",
        content: "For technical bugs, use the 'Report a Bug' button. For admissions queries, the 'Instant Chat' link connects you directly to the Arcadia Campus WhatsApp support line."
    },
    {
        title: "20. Final Note",
        content: "This portal is a tool for your future. Keep your login credentials safe and check your status weekly. Good luck with your application!"
    }
];

let currentHelpPage = 0;

function updateHelpUI() {
    const page = helpPages[currentHelpPage];
    document.getElementById('helpContent').innerHTML = `
        <h2 style="margin-bottom:20px; color:#4a90e2;">${page.title}</h2>
        <div style="font-size: 1.1rem; color: #555;">${page.content}</div>
    `;
    document.getElementById('pageIndicator').innerText = `Page ${currentHelpPage + 1} of ${helpPages.length}`;
    
    // Disable buttons at boundaries
    document.getElementById('prevHelpPage').disabled = (currentHelpPage === 0);
    document.getElementById('nextHelpPage').disabled = (currentHelpPage === helpPages.length - 1);
    
    // Scroll to top of content
    document.getElementById('helpCenterOverlay').scrollTo(0,0);
}

// Event Listeners
document.querySelector('a.q-link[href="#"]:nth-child(3)').onclick = (e) => {
    e.preventDefault();
    document.getElementById('helpCenterOverlay').style.display = 'block';
    updateHelpUI();
};

document.getElementById('closeHelpBtn').onclick = () => {
    document.getElementById('helpCenterOverlay').style.display = 'none';
};

document.getElementById('nextHelpPage').onclick = () => {
    if(currentHelpPage < helpPages.length - 1) {
        currentHelpPage++;
        updateHelpUI();
    }
};

document.getElementById('prevHelpPage').onclick = () => {
    if(currentHelpPage > 0) {
        currentHelpPage--;
        updateHelpUI();
    }
};





