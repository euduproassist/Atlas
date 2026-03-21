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

const guideOverlay = document.getElementById('guideOverlay');
const guideContent = document.getElementById('guidePageContent');
const pageIndicator = document.getElementById('pageNumber');
let currentPage = 0;

const guidePages = [
    {
        title: "1. Introduction & Security",
        content: `<h3>Welcome to the Student Portal</h3>
                  <p>This portal is designed to streamline your application to TUT Arcadia. We use secure Firebase Authentication to ensure your data is protected.</p>
                  <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0;">
                    <strong>Note:</strong> Your session is monitored. If you are not logged in, the system will automatically redirect you to the login page for security.
                  </div>`
    },
    {
        title: "2. Real-Time Auto-Save (The Cloud Sync)",
        content: `<h3>Never Lose Your Progress</h3>
                  <p>Our system uses a <strong>'Silent Sync'</strong> technology. When you type in the application form, the portal waits for 2 seconds of inactivity and automatically pushes your data to the cloud.</p>
                  <ul>
                    <li>If your internet cuts out, your data is safe.</li>
                    <li>If you close the browser, you can continue exactly where you left off.</li>
                    <li>Look for the 'Already Uploaded' checkmarks in Step 3 to see what we've saved.</li>
                  </ul>`
    },
    {
        title: "3. Step 1: Personal Information",
        content: `<h3>Completing your Profile</h3>
                  <p>In this section, you provide your identity and contact details. We have removed the collection of sensitive ID numbers from visible fields for your safety.</p>
                  <p><strong>Nationality:</strong> If you select 'Other', a mandatory field will appear. You must specify your country to proceed to Step 2.</p>`
    },
    {
        title: "4. Step 2: Academic History",
        content: `<h3>School Results & APS</h3>
                  <p>This is the most critical part of your application. You must enter your matric subjects one by one.</p>
                  <p>The <strong>'Add Subject'</strong> button only appears once the current row is fully completed (Subject Name, Percentage, and Level). This ensures your APS calculation is accurate.</p>`
    },
    {
        title: "5. Post-School Qualifications",
        content: `<h3>Previous Studies</h3>
                  <p>If you have studied before, use this section. If you mark a qualification as <strong>'Discontinued'</strong>, the system will intelligently disable the 'Year Completed' field as it is no longer applicable.</p>`
    },
    {
        title: "6. Step 3: The Document Vault",
        content: `<h3>Secure File Storage</h3>
                  <p>The Vault handles 11 specific document types (ID, Matric Results, etc.).</p>
                  <p>Once a file is uploaded, the cloud generates a unique URL. In the portal, these files will be marked with a green ✅. You do not need to re-upload files that are already marked as saved.</p>`
    },
    {
        title: "7. Step 4: Final Review",
        content: `<h3>Verification before Submission</h3>
                  <p>Before final submission, the system generates a <strong>Summary Card</strong>. It pulls your Choice 1 preference, your calculated APS, and verifies your Document Vault status. Review this carefully; once submitted, the data moves from 'Draft' to 'Final Application'.</p>`
    },
    {
        title: "8. Tracking Status",
        content: `<h3>Outcome Logic</h3>
                  <p>When you click 'Track Status', the portal interprets your results:</p>
                  <ul>
                    <li><strong>Accepted:</strong> Your 1st choice is successful.</li>
                    <li><strong>Rejected:</strong> The system automatically activates your 2nd choice for review.</li>
                    <li><strong>Pending:</strong> Staff are still evaluating your primary choice.</li>
                  </ul>`
    }
    // You can add up to 15-20 pages here following the same format
];

function renderPage() {
    const page = guidePages[currentPage];
    guideContent.innerHTML = `<h2 style="color:#4a90e2; margin-bottom:10px;">${page.title}</h2>${page.content}`;
    pageIndicator.innerText = `Page ${currentPage + 1} of ${guidePages.length}`;
    
    // Scroll to top of guide
    guideOverlay.scrollTop = 0;
}

// Event Listeners
document.querySelector('a.q-link:nth-child(3)').onclick = (e) => {
    e.preventDefault();
    guideOverlay.style.display = 'block';
    renderPage();
};

document.getElementById('closeGuide').onclick = () => guideOverlay.style.display = 'none';

document.getElementById('nextPage').onclick = () => {
    if (currentPage < guidePages.length - 1) {
        currentPage++;
        renderPage();
    }
};

document.getElementById('prevPage').onclick = () => {
    if (currentPage > 0) {
        currentPage--;
        renderPage();
    }
};






