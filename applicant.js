Import { auth, db } from './firebase-config.js';
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




<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Student Application Portal</title>
    <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --primary-blue: #4a90e2; --bg-light: #f9fafc; --text-dark: #333; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
        body { background-color: var(--bg-light); color: var(--text-dark); }

        /* Loading Overlay */
        #loader {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: white; display: flex; justify-content: center;
            align-items: center; z-index: 1000;
        }

        /* Navbar */
        .navbar {
            background: white; padding: 15px 40px; display: flex;
            justify-content: space-between; align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .logo { display: flex; align-items: center; gap: 10px; color: #556080; font-weight: 600; }
        .logo i { color: var(--primary-blue); font-size: 1.5rem; }
        .user-menu { display: flex; align-items: center; gap: 8px; cursor: pointer; }

        /* Main Content */
        .container { max-width: 1000px; margin: 50px auto; padding: 0 20px; }
        .welcome-section h2 { font-size: 2rem; margin-bottom: 10px; }
        .welcome-section p { color: #666; margin-bottom: 30px; }

        .dashboard-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }

        /* Status Card */
        .card { background: white; border-radius: 8px; border: 1px solid #eef0f5; padding: 25px; position: relative; }
        .card-header { display: flex; align-items: flex-start; gap: 15px; }
        .status-icon { background: #e3f2fd; color: var(--primary-blue); padding: 10px; border-radius: 50%; }
        .card-content h3 { font-size: 1.2rem; margin-bottom: 10px; }
        .card-content p { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
        .btn-continue { 
            background: var(--primary-blue); color: white; border: none; 
            padding: 10px 20px; border-radius: 4px; cursor: pointer; float: right;
        }

        /* Action Buttons */
        .action-list { display: flex; flex-direction: column; gap: 15px; }
        .btn-action {
            background: white; border: 1px solid #eef0f5; padding: 15px;
            display: flex; align-items: center; gap: 15px; border-radius: 8px;
            text-decoration: none; color: var(--text-dark); transition: 0.2s;
        }
        .btn-action:hover { border-color: var(--primary-blue); }
        .btn-action i { color: #999; font-size: 1.2rem; }

        /* Quick Links */
        .quick-links { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
        .links-grid { display: flex; gap: 40px; margin-top: 15px; }
        .q-link { text-decoration: none; color: #666; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
    </style>
</head>
<body>

    <div id="loader"><i class="fas fa-circle-notch fa-spin fa-2x" style="color: #4a90e2;"></i></div>

    <nav class="navbar">
        <div class="logo">
            <i class="fas fa-graduation-cap"></i>
            <span>STUDENT APPLICATION PORTAL</span>
        </div>
        <div class="user-menu" id="logoutBtn">
            <i class="fas fa-user-circle fa-lg" style="color: #ccc;"></i>
            <span id="userNameDisplay">User</span>
            <i class="fas fa-caret-down"></i>
        </div>
    </nav>

    <div class="container">
        <div class="welcome-section">
            <h2 id="welcomeText">Welcome!</h2>
            <p>Let's get started with your application process.</p>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <div class="status-icon"><i class="fas fa-exclamation-circle"></i></div>
                    <div class="card-content">
                        <h3>Application Form</h3>
                        <p>Please click the button below to go to your application process.</p>
                        <button class="btn-continue" onclick="window.location.href='apply.html'">Enter Application</button>
                    </div>
                </div>
            </div>

            <div class="action-list">
                <a href="#" class="btn-action">
                    <i class="fas fa-camera"></i>
                    <span>Upload Documents</span>
                </a>
            <button class="btn-action" id="trackStatusBtn" style="width: 100%; cursor: pointer;">
            <i class="far fa-list-alt"></i>
            <span>Track Application Status</span>
            </button>
            </div>
        </div>

        <div class="quick-links">
            <div class="logo" style="font-size: 0.9rem;"><i class="fas fa-pencil-alt"></i> Quick Links</div>
            <div class="links-grid">
                <a href="#" class="q-link" id="updateProfileBtn"><i class="far fa-user"></i> Update Profile</a>              
                <a href="#" class="q-link"><i class="far fa-envelope"></i> Contact Support</a>
                <a href="#" class="q-link"><i class="far fa-question-circle"></i> Help Center</a>
            </div>
        </div>
    </div>

    <!-- Status Tracking Modal -->
<div id="statusModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:2000; justify-content:center; align-items:center; padding:20px;">
    <div style="background:white; width:100%; max-width:900px; border-radius:4px; overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
  <!-- Modal Header with Zoom Controls -->
<div style="background: #e3f2fd; padding: 15px 20px; border-bottom: 1px solid #bbdefb; display: flex; justify-content: space-between; align-items: center;">
    <h2 style="font-size: 1rem; font-weight: 700; color: #1976d2; margin: 0; text-transform: uppercase;">Application Profile Summary</h2>
    <div style="display: flex; gap: 10px; align-items: center;">
        <!-- Zoom Controls -->
        <button onclick="changeZoom(-0.1)" style="padding: 5px 10px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 4px;"><i class="fas fa-search-minus"></i></button>
        <button onclick="changeZoom(0.1)" style="padding: 5px 10px; cursor: pointer; border: 1px solid #ccc; background: white; border-radius: 4px;"><i class="fas fa-search-plus"></i></button>
        <button onclick="document.getElementById('statusModal').style.display='none'" style="background:none; border:none; font-size: 24px; cursor:pointer; color:#999; margin-left: 10px;">&times;</button>
    </div>
</div>
        <div id="statusModalBody" style="padding: 30px; transition: transform 0.2s ease; transform-origin: top center; overflow-x: auto; -webkit-overflow-scrolling: touch;">
    <!-- Data will be injected here by applicant.js -->
</div>

        <div style="padding: 15px 20px; background: #f8f9fa; text-align: right; border-top: 1px solid #eee;">
            <button onclick="document.getElementById('statusModal').style.display='none'" style="padding: 8px 20px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
    </div>
</div>

    <script type="module" src="applicant.js"></script>
</body>
</html>

Now lets go to the help center link this one is a bit different now it should appear like a book when press this is where we will explain everything that happens inside this portal section by section starting woth login to starting the application process which is this 
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";
const storage = getStorage();

const mainForm = document.getElementById('mainApplyForm');
let currentStep = 1;
let syncTimer;

    const filesToUpload = [
        { id: 'file_id', name: 'ID_Passport' },
        { id: 'file_birth', name: 'Birth_Certificate' },
        { id: 'file_marriage', name: 'Marriage_Certificate' },
        { id: 'file_matric', name: 'Matric_Certificate' },
        { id: 'file_grade11', name: 'Grade_11_Results' },
        { id: 'file_transcripts', name: 'Transcripts' },
        { id: 'file_address', name: 'Proof_of_Address' },
        { id: 'file_pop', name: 'Proof_of_Payment' },
        { id: 'file_sponsor', name: 'Sponsor_ID' },
        { id: 'file_motivation', name: 'Motivation_Letter' },
        { id: 'file_cv', name: 'CV' }
    ];

window.toggleOtherNationality = function(value) {
    const otherGroup = document.getElementById('otherNationalityGroup');
    const otherInput = document.getElementById('otherNationality');
    
    if (value === 'Other') {
        otherGroup.style.display = 'block';
        otherInput.required = true; // This forces the browser to wait for input
    } else {
        otherGroup.style.display = 'none';
        otherInput.required = false; 
        otherInput.value = ''; // Clear it if they switch back to SA
    }
};

// This saves data to the cloud only after 2 seconds of 'silence' (no typing)
async function syncFieldToCloud(fieldId, value) {
    const user = auth.currentUser;
    if (!user || !fieldId) return;

    try {
        // We create a reference to the 'draft' object to ensure arrays overwrite correctly
        const dataToSave = {
            currentStep: currentStep,
            lastUpdated: new Date(),
            draft: {} 
        };
        dataToSave.draft[fieldId] = value;

        await setDoc(doc(db, "drafts", user.uid), dataToSave, { merge: true });
    } catch (e) {
        console.error("Sync error:", e);
    }
}

window.toggleDisability = function(value) {
    const container = document.getElementById('disabilityDetailsContainer');
    if (value === 'Yes') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        // Reset and hide extra boxes
        document.getElementById('disability1').value = '';
        document.getElementById('disability2').value = '';
        document.getElementById('disability3').value = '';
        document.getElementById('box2').style.display = 'none';
        document.getElementById('box3').style.display = 'none';
    }
};

window.checkAddButton = function() {
    const d1 = document.getElementById('disability1').value;
    const d2 = document.getElementById('disability2').value;
    
    document.getElementById('addBtn1').style.display = (d1.length > 0 && document.getElementById('box2').style.display === 'none') ? 'block' : 'none';
};

window.addDisabilityBox = function() {
    if (document.getElementById('box2').style.display === 'none') {
        document.getElementById('box2').style.display = 'block';
        document.getElementById('addBtn1').style.display = 'none';
    } else if (document.getElementById('box3').style.display === 'none') {
        document.getElementById('box3').style.display = 'block';
    }
};

window.toggleOtherQual = function(value) {
    const otherGroup = document.getElementById('otherQualGroup');
    const otherInput = document.getElementById('otherQual');
    
    if (value === 'Other') {
        otherGroup.style.display = 'block';
        otherInput.required = true;
    } else {
        otherGroup.style.display = 'none';
        otherInput.required = false;
        otherInput.value = ''; 
    }
    // Automatically save the selection to cloud
    syncFieldToCloud('examBody', value);
};


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.getElementById('email').value = user.email || '';

 // --- LOAD SAVED DATA FROM CLOUD ---
const docSnap = await getDoc(doc(db, "drafts", user.uid));
if (docSnap.exists()) {
    const data = docSnap.data();
    const draft = data.draft || {};

    // Fill standard inputs
    Object.keys(draft).forEach(key => {
        const input = document.getElementById(key);
        if (input && input.type !== 'file') { 
            input.value = draft[key];
        }
    });

    // --- FIX: REBUILD SUBJECT ROWS ---
    if (draft.subjects && draft.subjects.length > 0) {
        const container = document.getElementById('subjectsContainer');
        container.innerHTML = ''; // Clear the default empty row
        subjectCount = 0; // Reset counter for clean rebuild

        draft.subjects.forEach((sub, index) => {
            window.addSubjectRow(); // This creates row1, row2, etc.
            const row = document.getElementById(`row${index + 1}`);
            if (row) {
                row.querySelector('.sub-name').value = sub.name || '';
                row.querySelector('.sub-perc').value = sub.percentage || '';
                row.querySelector('.sub-level').value = sub.level || '';
            }
        });
        // Ensure the "Add" button shows up if the last row is complete
        window.validateRows(); 
    }

    // --- FIX: REBUILD POST-SCHOOL QUALIFICATIONS ---
    if (draft.postSchoolQualifications && draft.postSchoolQualifications.length > 0) {
        const psContainer = document.getElementById('postSchoolContainer');
        psContainer.innerHTML = ''; // Clear default

        draft.postSchoolQualifications.forEach((qual) => {
            window.addPostSchoolRow();
            const rows = document.querySelectorAll('.post-school-row');
            const lastRow = rows[rows.length - 1];
            const inputs = lastRow.querySelectorAll('.ps-input');
            
            inputs[0].value = qual.institutionalName || '';
            inputs[1].value = qual.qualificationName || '';
            
            const statusSelect = lastRow.querySelector('.ps-status');
            statusSelect.value = qual.status || '';
            
            inputs[2].value = qual.studentNumber || '';
            inputs[3].value = qual.modulePercentageAverage || '';
            
            const yearInput = lastRow.querySelector('.ps-year');
            yearInput.value = qual.yearCompleted || '';
            
            // Trigger the disabled logic for 'Discontinued' status
            window.handleDiscontinued(statusSelect);
        });
        window.validatePostSchool();
    }

             // 1. Restore the correct Step/Page
           if (data.currentStep) {
            currentStep = data.currentStep;
            // Hide all steps first
            document.getElementById('step1Container').style.display = 'none';
            document.getElementById('step2Container').style.display = 'none';
            document.getElementById('step3Container').style.display = 'none';
            if(document.getElementById('step4Container')) document.getElementById('step4Container').style.display = 'none';

            
            // Show the saved step
            document.getElementById(`step${currentStep}Container`).style.display = 'block';

   // --- NEW: Restore Uploaded Document Status ---
const savedDocs = data.documents || {};
Object.keys(savedDocs).forEach(docName => {
    // We find the input based on the 'name' used in the filesToUpload array
    const fileId = filesToUpload.find(f => f.name === docName)?.id;
    if (fileId) {
        const input = document.getElementById(fileId);
        const label = input.previousElementSibling;
        if (label) {
            label.innerHTML += ` <span style="color: #27ae60; font-size: 0.8rem;">(Already Uploaded ✅)</span>`;
            input.required = false; // Remove requirement since it's already in the cloud
        }
    }
});

                           if(currentStep === 4 && typeof window.renderReviewSummary === "function") {
                window.renderReviewSummary();
            }
            
            // Update progress bar UI (dots)
            for(let i=1; i<=currentStep; i++) {
                document.getElementById(`dot${i}`).classList.add('active');
                if(i < currentStep) document.getElementById(`line${i}`).classList.add('active');
                  }
               }

                if (data.draft['examBody'] === 'Other') {
                   document.getElementById('examBody').value = 'Other';
                   document.getElementById('otherQualGroup').style.display = 'block';
                   document.getElementById('otherQual').value = data.draft['otherQual'] || '';
               }

              // NEW: Ensure the box shows up if 'Other' was previously saved
              const savedNationality = data.draft['nationality'];
                if (savedNationality === 'Other') {
                   document.getElementById('otherNationalityGroup').style.display = 'block';
                   document.getElementById('otherNationality').required = true;
               }
        // 2. NEW: Restore Disability boxes
        const savedDisability = data.draft['disability'];
        if (savedDisability === 'Yes') {
            document.getElementById('disabilityDetailsContainer').style.display = 'block';
            
            // Show box 2 if it has data
            if (data.draft['disability2']) {
                document.getElementById('box2').style.display = 'block';
            }
            // Show box 3 if it has data
            if (data.draft['disability3']) {
                document.getElementById('box3').style.display = 'block';
            }
        }
            }
        }
});

// Save when they stop typing for 2 seconds
mainForm.addEventListener('input', (e) => {
    // ADDED: List of IDs to IGNORE for auto-saving
    const ignoreList = ['nationality', 'otherNationality']; 
    
    if (e.target.id && e.target.type !== 'file' && !ignoreList.includes(e.target.id)) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncFieldToCloud(e.target.id, e.target.value);
        }, 2000); 
    }
});

// Save IMMEDIATELY when they click or tab out of a field
mainForm.addEventListener('focusout', (e) => {
    if (e.target.id && e.target.type !== 'file') {
        syncFieldToCloud(e.target.id, e.target.value);
    }
});

mainForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (currentStep === 1) {
        // Collect Step 1 Data (Identity, Contact, Address, Demographic, NOK, Socio)
        const step1Data = {
            fullNames: document.getElementById('fullNames').value,
            surname: document.getElementById('surname').value,
            idNumber: document.getElementById('idNumber').value,
            dob: document.getElementById('dob').value,
            gender: document.getElementById('gender').value,
            title: document.getElementById('title').value,
            nationality: document.getElementById('nationality').value === 'Other'
                         ? document.getElementById('otherNationality').value
                         : document.getElementById('nationality').value,
            homeLanguage: document.getElementById('homeLanguage').value,
            email: document.getElementById('email').value,
            mobile: document.getElementById('mobile').value,
            altPhone: document.getElementById('altPhone').value,
            address: {
                street: document.getElementById('physStreet').value,
                suburb: document.getElementById('physSuburb').value,
                province: document.getElementById('physProvince').value,
                postalCode: document.getElementById('physPostalCode').value,
                country: document.getElementById('physCountry').value
            },
            postalAddress: {
                street: document.getElementById('postStreet').value,
                suburb: document.getElementById('postSuburb').value,
                province: document.getElementById('postProvince').value,
                postalCode: document.getElementById('postPostalCode').value,
                country: document.getElementById('postCountry').value
            },
            race: document.getElementById('race').value,
            disability: document.getElementById('disability').value,
            disabilityDetails: document.getElementById('disability').value === 'Yes' 
            ? [
            document.getElementById('disability1').value,
            document.getElementById('disability2').value,
            document.getElementById('disability3').value
            ].filter(val => val !== "") 
            : [],
            citizenship: document.getElementById('citizenship').value,
            nokName: document.getElementById('nokName').value,
            nokRelation: document.getElementById('nokRelation').value,
            nokPhone: document.getElementById('nokPhone').value,
            marital: document.getElementById('marital').value,
            employment: document.getElementById('employment').value,
            socialGrant: document.getElementById('socialGrant').value,
            lastUpdated: new Date()
        };

        try {
            await setDoc(doc(db, "drafts", user.uid), {
                step1: step1Data,
                currentStep: 2
            }, { merge: true });

            // SWITCH UI TO STEP 2
            goToStep(2);


        } catch (error) {
            alert("Error: " + error.message);
        }

            } else if (currentStep === 2) {
        // Collect ALL Step 2 Data from your list
        // Collect dynamic subject rows
            const subjectsList = [];
            document.querySelectorAll('#subjectsContainer .form-grid').forEach(row => {
                  subjectsList.push({
            name: row.querySelector('.sub-name').value,
            percentage: row.querySelector('.sub-perc').value,
            level: row.querySelector('.sub-level').value
               });
            });

      // --- THE NEW POST-SCHOOL LOGIC HERE ---
        const postSchoolRows = document.querySelectorAll('.post-school-row');
        const val = validatePostSchool();

        // If any part of the section has data, ensure the last row is fully valid
        if (val.anyFilled && !val.allFilled) {
            alert("Please ensure all 6 fields are filled in your last qualification entry, or clear them to proceed.");
            return;
        }

        const qualData = [];
        if (val.allFilled) {
            postSchoolRows.forEach(row => {
                const inputs = row.querySelectorAll('.ps-input');
                const status = row.querySelector('.ps-status').value;
                const year = row.querySelector('.ps-year').value;
                qualData.push({
                    institutionalName: inputs[0].value,
                    qualificationName: inputs[1].value,
                    status: status,
                    studentNumber: inputs[2].value,
                    modulePercentageAverage: inputs[3].value,
                    yearCompleted: year
                });
            });
        }
        const step2Data = {
            // 1. Matric Details
            schoolName: document.getElementById('schoolName').value,
            schoolCountry: document.getElementById('schoolCountry').value,
            schoolProvince: document.getElementById('schoolProvince').value,
            matricYear: document.getElementById('matricYear').value,
            examBody: document.getElementById('examBody').value === 'Other'
                ? document.getElementById('otherQual').value
                : document.getElementById('examBody').value,
                           
            currentStatus: document.getElementById('currentStatus').value,
            
            // 2. Marks & APS
            subjects: subjectsList,
            APS: document.getElementById('APS').value,

           // 3. NEW DYNAMIC POST-SCHOOL FIELD
            postSchoolQualifications: qualData,
            
            // 4. Choices
            choice1: document.getElementById('choice1').value,
            choice2: document.getElementById('choice2').value,
            acadYear: document.getElementById('acadYear').value,
            campus: document.getElementById('campus').value,
            attendance: document.getElementById('attendance').value,
            
            // 5. Additional
            nbtNum: document.getElementById('nbtNum').value,
            housing: document.getElementById('housing').value,
            nsfas: document.getElementById('nsfas').value,
            
            lastUpdated: new Date()
        };

        try {
            await setDoc(doc(db, "drafts", user.uid), {
                step2: step2Data,
                progress: 50, // Updated progress
                currentStep: 3
            }, { merge: true });
            
            // Logic to move to Step 3 would go here
            goToStep(3);


        } catch (error) {
            alert("Error: " + error.message);
        }

        } else if (currentStep === 3) {

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.innerText = "Please wait...";
    uploadBtn.disabled = true;

    const uploadPromises = filesToUpload.map(async (f) => {
        const fileInput = document.getElementById(f.id);
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `applications/${user.uid}/${f.name}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        }
        return null;
    });

    try {
        const urls = await Promise.all(uploadPromises);
        const documentData = {};
        filesToUpload.forEach((f, index) => {
            if (urls[index]) documentData[f.name] = urls[index];
        });

        await setDoc(doc(db, "drafts", user.uid), {
            documents: documentData,
            lastUpdated: new Date()
        }, { merge: true });

        // At the very end of your final step logic:
        const draftSnap = await getDoc(doc(db, "drafts", user.uid));

        if (draftSnap.exists()) {
        await setDoc(doc(db, "applications", user.uid), {
        ...draftSnap.data(),
        status: "pending",
        submittedAt: new Date()
        },
        { merge: true});  
    
      alert("Application Submitted Successfully!");
       }

       // PASTE THIS INSTEAD:
        goToStep(4);
        if (typeof renderReviewSummary === "function") renderReviewSummary();

    } catch (error) {
        alert("Upload failed: " + error.message);
        uploadBtn.innerText = "Upload & Continue";
        uploadBtn.disabled = false;
    }
}

});

function populateMatricYears() {
    const select = document.getElementById('matricYear');
    const currentYear = new Date().getFullYear();
    
    // Start 50 years ago, end 10 years into the future
    for (let year = currentYear - 50; year <= currentYear + 10; year++) {
        let option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    }
}

// Call this function when the script loads
populateMatricYears();

let subjectCount = 0;

window.addSubjectRow = function() {
    subjectCount++;
    const container = document.getElementById('subjectsContainer');
    const row = document.createElement('div');
    row.className = 'form-grid';
    row.style.marginBottom = '10px';
    row.id = `row${subjectCount}`;
    row.innerHTML = `
        <div class="input-group"><input type="text" placeholder="Subject Name" class="sub-name" oninput="validateRows()"></div>
        <div class="input-group"><input type="number" placeholder="Percentage" class="sub-perc" oninput="validateRows()"></div>
        <div class="input-group"><input type="number" placeholder="Level" class="sub-level" oninput="validateRows()"></div>
    `;
    container.appendChild(row);
    document.getElementById('addSubjectRowBtn').style.display = 'none';
}

window.validateRows = function() {
    const rows = document.querySelectorAll('#subjectsContainer .form-grid');
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('input');
    
    // Check if the "Add" button should show
    const allFilled = Array.from(inputs).every(input => input.value.trim() !== "");
    document.getElementById('addSubjectRowBtn').style.display = allFilled ? 'block' : 'none';

    // --- CRITICAL: MOVE THIS INSIDE THE BRACKETS ---
    const subjectsList = [];
    rows.forEach(row => {
        subjectsList.push({
            name: row.querySelector('.sub-name').value,
            percentage: row.querySelector('.sub-perc').value,
            level: row.querySelector('.sub-level').value
        });
    });
     // Explicitly pass the full array to ensure the cloud matches the UI exactly
    if (subjectsList.length > 0) {
        syncFieldToCloud('subjects', subjectsList); 
    }

};


// Add this new logic to handle Discontinued status
window.handleDiscontinued = function(selectElement) {
    const row = selectElement.closest('.post-school-row');
    const yearInput = row.querySelector('.ps-year');
    if (selectElement.value === 'Discontinued') {
        yearInput.disabled = true;
        yearInput.value = '';
    } else {
        yearInput.disabled = false;
    }
};

window.addPostSchoolRow = function() {
    const container = document.getElementById('postSchoolContainer');
    const row = document.createElement('div');
    row.className = 'form-grid post-school-row';
    row.style.cssText = "margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;";
    row.innerHTML = `
        <div class="input-group"><label>Institutional name</label><input type="text" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Qualification name</label><input type="text" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Status</label><select class="ps-status" onchange="validatePostSchool(); handleDiscontinued(this)"><option value="">Select</option><option value="Completed">Completed</option><option value="Registered">Currently Registered</option><option value="Discontinued">Discontinued</option></select></div>
        <div class="input-group"><label>Student Number</label><input type="text" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Module percentage average</label><input type="number" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Year Completed/to be completed</label><input type="number" class="ps-year" oninput="validatePostSchool()"></div>
    `;
    container.appendChild(row);
    document.getElementById('addPostSchoolBtn').style.display = 'none';
};

window.validatePostSchool = function() {
    const rows = document.querySelectorAll('.post-school-row');
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('.ps-input');
    const status = lastRow.querySelector('.ps-status');
    const year = lastRow.querySelector('.ps-year');
    
    let allFilled = true;
    let anyFilled = false;
    
    inputs.forEach(i => { if(i.value.trim() !== "") anyFilled = true; else allFilled = false; });
    if(status.value === "") allFilled = false; else anyFilled = true;
    if(status.value !== 'Discontinued' && year.value.trim() === "") allFilled = false;
    
    document.getElementById('addPostSchoolBtn').style.display = (allFilled) ? 'block' : 'none';

    // --- CRITICAL: MOVE THIS INSIDE THE BRACKETS ---
    const qualData = [];
    rows.forEach(row => {
        const rowInputs = row.querySelectorAll('.ps-input');
        qualData.push({
            institutionalName: rowInputs[0].value,
            qualificationName: rowInputs[1].value,
            status: row.querySelector('.ps-status').value,
            studentNumber: rowInputs[2].value,
            modulePercentageAverage: rowInputs[3].value,
            yearCompleted: row.querySelector('.ps-year').value
        });
    });
   // Explicitly pass the full array
    if (qualData.length > 0) {
        syncFieldToCloud('postSchoolQualifications', qualData);
    }

    return { allFilled, anyFilled };
};

// Add this at the very end of apply.js
window.goToStep = async function(stepNumber) {
    const user = auth.currentUser;
    
    // Hide current step
    document.getElementById(`step${currentStep}Container`).style.display = 'none';
    
    // Show new step
    document.getElementById(`step${stepNumber}Container`).style.display = 'block';
    
    // Update the step counter
    currentStep = stepNumber;

    // Save the step progress to Firebase immediately (R0 cost - tiny string)
    if (user) {
        await setDoc(doc(db, "drafts", user.uid), { currentStep: currentStep }, { merge: true });
    }
    window.scrollTo(0, 0);
};

window.renderReviewSummary = async function() {
    const user = auth.currentUser;
    const docSnap = await getDoc(doc(db, "drafts", user.uid));
    const summaryDiv = document.getElementById('reviewSummary');
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        const s1 = data.step1 || {};
        const s2 = data.step2 || {};

        summaryDiv.innerHTML = `
            <h3 style="color:var(--primary); border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">Application Summary</h3>
            <p><strong>Full Name:</strong> ${s1.fullNames} ${s1.surname}</p>
            <p><strong>Identity Number:</strong> ${s1.idNumber}</p>
            <p><strong>Email:</strong> ${s1.email}</p>
            <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
            <p><strong>1st Choice:</strong> ${s2.choice1}</p>
            <p><strong>Academic Year:</strong> ${s2.acadYear}</p>
            <p><strong>Total APS:</strong> ${s2.APS}</p>
            <p style="margin-top:15px; color:#27ae60; font-weight:600;"><i class="fas fa-check-circle"></i> Documents have been uploaded to the vault.</p>
        `;
    }
};

// --- THE STARTUP CHECK ---
setTimeout(() => {
    const container = document.getElementById('subjectsContainer');
    if (container && container.children.length === 0) {
        window.addSubjectRow();
    }
}, 1000);

Now when the help center link is pressed the whole screen should lead to a new page where there all the instructions of how this portal work like everything i shown you you have seen all my codes so be sure to explain everything one by one section by section other by other, it should be able 15-20.pages of instructions that mean we have page 1 of 20 up to page 20 of 20 so u have plenty of room to explain everything in a sequential and arranged way so be sure everything is clean and not messy amd packed unprofessional..remember this is not a joptionpane style this is line a new page that over lays the whole screen and there is a back button to go back to the portal so make it clean dont forger the heading the something like students portal guideline or something like that dont forgot the graduation hat so be sure that put that next to the heading keep everything simple, clean, arranged, professional and no decorations and no colors feel free to use color white, black, light blue only where necessary lets go show me only the codes i should add dont give me full updated codes just give new codes to add and lines that need updates






