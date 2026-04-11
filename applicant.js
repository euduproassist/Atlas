import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

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

         // --- FIXED LOGIC: Syncing with Staff Portal 'status1' and 'status2' ---
        const currentStatus = data.status1 || "pending";
        
        // --- UI Construction ---
        body.innerHTML = `
            <div style="display: flex; gap: 40px; margin-bottom: 30px;">
                <div>
                    <span style="color: #888; font-size: 0.85rem;">Application ID:</span>
                    <strong style="display: block;">${data.applicationId || 'Generating...'}</strong>
                    ${data.studentNumber ? `<span style="color: #2e7d32; font-size: 0.8rem;">Student No: ${data.studentNumber}</span>` : ''}
                </div>
                <div>
                    <span style="color: #888; font-size: 0.85rem;">Name:</span>
                    <strong style="display: block;">${s1.fullNames} ${s1.surname}</strong>
                </div>
            </div>

            <div style="width: 100%; overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
            <tr style="border-bottom: 2px solid #eee; color: #1976d2; font-size: 0.75rem; text-transform: uppercase;">
           <th style="padding: 10px;">Year</th>
               <th style="padding: 10px;">Qualification</th>
               <th style="padding: 10px;">Campus</th>
               <th style="padding: 10px;">Status</th> <!-- New Column -->
               <th style="padding: 10px;">Documents</th>
               </tr>
               </thead>
               <tbody style="font-size: 0.9rem;">
    <!-- 1st Choice Row -->
    <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 15px 10px;">${s2.acadYear || '2027'}</td>
        <td style="padding: 15px 10px;">${s2.choice1}</td>
        <td style="padding: 15px 10px;">${s2.campus}</td>
        <td style="padding: 15px 10px; font-weight: 700; color: #1976d2;">
    ${currentStatus === 'review' ? 'UNDER REVIEW' : 
      currentStatus === 'waiting' ? 'WAITING LIST' : 
      currentStatus === 'uncon_accepted' ? 'ACCEPTED' :
      currentStatus === 'withdrawn_expired' ? 'WITHDRAWN' :
      currentStatus.replace('_', ' ').toUpperCase()}
     </td>
        <td style="padding: 15px 10px;">
            ${data.adminDocs && data.adminDocs.acceptanceLetter ? `<a href="${data.adminDocs.acceptanceLetter}" target="_blank" style="color:#4a90e2; text-decoration: none;"><i class="fas fa-file-download"></i> View Letter</a>` : '<span style="color:#ccc;">None</span>'}
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
        title: "1. Official Welcome and Portal Overview",
        content: "Welcome to the Student Application Portal, your primary gateway to managing your academic journey and administrative requirements. This comprehensive guideline serves as an exhaustive manual to ensure that every applicant can navigate the system with absolute clarity and precision. The portal is designed to act as a bridge between the applicant and the institution, facilitating the submission of personal data, academic records, and supporting documentation through a streamlined, multi-step process. You are encouraged to read through this entire document carefully, as it contains critical instructions on how to accurately provide your information, how to interpret the various stages of your application status, and where to seek professional assistance should you encounter technical or administrative hurdles during your journey."
    },
    {
        title: "2. Initial Access: Registration and Security",
        content: "To begin your journey, you must first secure your account through our mandatory authentication layer. Every applicant is required to use a valid, functional email address that they check regularly. Upon registration, the system will trigger a mandatory verification email; you must click the link within that email to prove your identity and activate your portal access. If you attempt to enter the portal without completing this verification step, the system will automatically redirect you back to the login page as a security measure to protect your data. Within the dashboard, you will find a Profile Card that allows you to manage your credentials; if at any point you forget your password or feel your account is compromised, you can trigger a 'Password Reset' which will send a secure link directly to your registered inbox, ensuring that only you have control over your application progress."
    },
    {
        title: "3. Step 1: Mastering the Personal Information Section",
        content: "Section One is dedicated to your legal identity and contact profile. It is imperative that the names entered match exactly what is written on your Government-issued ID or Passport. In the 'Full Names' field, you should list all names as they appear on your birth certificate, while the 'Surname' field is reserved for your family name. When entering your ID or Passport number, double-check every digit for accuracy, as this is used for primary identification. For 'Nationality', if you are not a South African citizen, you must select 'Other', which will then prompt you to manually type in your country of origin. This section also requires a detailed physical and postal address; please include your street name, house number, suburb, and postal code correctly to ensure that any physical correspondence from the university reaches you without delay. You must also provide a primary mobile number and an alternative contact number—this alternative number is vital in case of emergencies or if your primary phone is unreachable during the admissions window."
    },
    {
        title: "4. Detailed Guidance on Demographic and Social Declarations",
        content: "As part of our commitment to social support and inclusivity, the portal asks for specific demographic details. This includes your home language, which helps us understand your communication preferences, and your marital and employment status. We also inquire about 'Social Grants'; if you are a recipient of financial aid from the government, please indicate this accurately as it may influence your eligibility for certain institutional support structures. Furthermore, the 'Next of Kin' section is mandatory; you must provide the full name, relationship (e.g., Parent, Sibling, Guardian), and a valid telephone number for someone the university can contact regarding your application or safety. Providing incomplete info in these sections can lead to delays, so ensure every field is addressed with the most current information available to you."
    },
    {
        title: "5. Comprehensive Disability Support and Accessibility",
        content: "If you have any physical or learning disability that requires the institution to provide special accommodations, you must declare it in the dedicated 'Disability' section. Upon selecting 'Yes', the system will present you with detailed input boxes where you can specify the nature of your disability. You are not limited to a single entry; the 'Add' buttons allow you to list up to three specific conditions. It is crucial to be as descriptive as possible—for example, instead of just saying 'Vision', you might specify 'Requires large-print materials' or 'Uses a screen reader'. This information is handled with the highest level of confidentiality and is strictly used to ensure that the campus environment is prepared to support your academic success from the moment you are admitted."
    },
    {
        title: "6. Step 2: Accurate Reporting of Academic History",
        content: "The Academic History section is perhaps the most critical part of your application. You must first identify your high school and the province where you completed your Matric. Use the dropdown menu to select the exact year you finished your schooling. For the 'Examination Body' (such as DBE, IEB, or SACAI), ensure you select the correct one; if you studied under a different curriculum, select 'Other' and specify the qualification type. For students who are currently in Grade 12, select the 'Currently Registered' status. This section is dynamic: you must enter each subject, followed by the percentage achieved and the corresponding level. Note that the 'Add Subject' button will only appear once you have completely filled in the previous row. This is to ensure that no subjects are left partially blank. The system then uses this data to calculate your APS (Admission Point Score), which is the primary metric used to determine if you meet the minimum entry requirements for your chosen qualification."
    },
    {
        title: "7. Post-Schooling and Previous Institutional Qualifications",
        content: "If you have previously studied at another college or university, you must disclose this in the 'Post-School Qualifications' section. This includes any certificates, diplomas, or degrees you have attempted or completed. You will need to provide the institutional name, the name of the qualification, your student number from that institution, and your average percentage across your modules. The 'Status' field is vital: 'Completed' means you have graduated, 'Registered' means you are still currently enrolled there, and 'Discontinued' means you stopped your studies before finishing. If you select 'Discontinued', the system will naturally disable the 'Year Completed' field since no completion occurred. Providing a full history of your previous studies is essential to avoid being rejected for 'Incomplete Info' or 'Non-Disclosure' during the auditing phase of your application."
    },
    {
        title: "8. Qualification Choices and Campus Selection Strategy",
        content: "The portal allows you to select two choices for your study programme. Your '1st Choice' should be the qualification you most desire to study. Your '2nd Choice' acts as a safety net; the admissions office will typically only evaluate your 2nd choice if you do not meet the requirements for your 1st choice or if that programme is already full. You must also select your preferred 'Campus' (such as Arcadia) and your 'Attendance' mode—usually Full-time or Part-time. Double-check that you meet the specific APS requirements for both choices before submitting, as choosing a programme for which you do not qualify will result in an automatic rejection. Also, ensure you select the correct 'Academic Year' for which you are applying (e.g., 2027) to ensure your application is placed in the correct intake cycle."
    },
    {
        title: "9. Step 3: The Document Vault and Upload Procedures",
        content: "Once you have completed the data entry, you must move to the 'Document Vault'. Here, you are required to upload digital copies of your supporting documents. This includes a certified copy of your ID or Passport, your Matric results, and any transcripts from previous institutions. If you are a minor or have a sponsor, you may need to upload a 'Sponsor ID' and 'Proof of Payment' for your application fee. To upload, click the 'Upload Documents' button or navigate to the specific file input fields. Ensure your files are clear, legible, and in a standard format (PDF or JPEG). Once a document is successfully saved to our system, you will see a green 'Already Uploaded ✅' confirmation. If you receive a status of 'Missing Info' later, you must return to this section to provide the specific documents that were flagged as missing or illegible by the administrative staff."
    },
    {
        title: "10. Step 4: Final Review and Submission Commitment",
        content: "Before your application is finalized, the system presents a 'Review Summary'. This page displays a condensed version of all the data you have entered, from your full name and ID number to your primary course choices. You must scroll through this summary meticulously. If you notice an error in your APS, your email, or your spelling, you must navigate back to the previous steps to correct it. Once you click the 'Submit' button, your application is locked and sent to the admissions queue. At this point, your status will change to 'Pending', and you will no longer be able to edit your primary details without contacting support. Submission is a legal commitment that all information provided is true and accurate to the best of your knowledge."
    },
    {
        title: "11. Understanding Application Status Meanings",
        content: "Once submitted, your application will go through several stages. It is vital that you understand what each status means so you can react accordingly: \n\n" +
                  "• PENDING: Your application has been received and is waiting in the queue for an administrator to open it.\n" +
                  "• UNDER REVIEW: An admissions officer is currently looking at your marks and documents to see if you qualify.\n" +
                  "• MISSING INFO: This is a critical status. It means the admin team found an error, such as a blurry ID photo or a missing certificate. You must check your dashboard for notes on what is missing and upload it immediately to keep your application active.\n" +
                  "• PROVISIONALLY ACCEPTED: You have been accepted based on your current marks (e.g., Grade 11 or Mid-year Grade 12), but this is dependent on you maintaining those marks in your final exams.\n" +
                  "• UNCONDITIONALLY ACCEPTED: You have met all requirements and have been fully admitted into the programme. Congratulations!\n" +
                  "• WAITING LIST: You qualify for the course, but the programme is currently full. You will be contacted if a space opens up.\n" +
                  "• REJECTED: Your application was not successful. Common reasons include 'False Info' (providing fake marks), 'Incomplete Info' (failing to upload documents after a request), or 'Below Requirements' (your APS was too low for the chosen course)."
    },
    {
        title: "12. How to Avoid Rejection and Technical Troubleshooting",
        content: "To ensure your application has the highest chance of success, always be honest and thorough. Avoid 'False Info' at all costs, as our system verifies marks against national databases; any discrepancy will result in a permanent ban from the institution. If you experience technical issues—such as the portal not loading or buttons not responding—first check your internet connection and ensure you are using a modern browser like Chrome or Edge. If the 'Loader' (the spinning circle) stays on your screen for more than a minute, try refreshing the page or logging out and back in. For lost passwords, use the 'Help Center' link to reset your credentials. Always keep a record of your Application ID (e.g., APP-XXXXX), as you will need this whenever you speak to a support agent."
    },
    {
        title: "13. Contacting Support and Accessing the Help Desk",
        content: "The portal provides multiple layers of support to ensure you are never stranded. If you have questions about your application status or course requirements, use the 'Contact Support' link to reach the Arcadia Campus Admissions office via email at arcadiaadmissions@tut.ac.za. For technical bugs or issues with the Document Vault (such as files failing to upload), you should contact the Tech Support team at techsupport@tut.ac.za. For the fastest response during office hours (Monday to Friday, 08:00 to 15:30), we have provided an Instant WhatsApp Chat link. This allows you to speak directly with an advisor who can guide you through the process in real-time. Please be patient during peak application periods, as response times may be longer than usual."
    },
    {
        title: "14. Final Legal Declaration and Terms of Use",
        content: "By proceeding with your application on this portal, you hereby declare that you understand and agree to the following conditions: You certify that all information provided is, to the best of your knowledge, complete and accurate. You acknowledge that the institution reserves the right to cancel your application or registration if any information is found to be false or misleading. You consent to the institution processing your personal data for the purposes of admissions and academic administration. You also agree to check the portal regularly for status updates and to respond promptly to any requests for 'Missing Info'. This portal is a professional tool designed for your benefit; misuse of the system or attempting to bypass security measures will result in immediate termination of your access and potential legal consequences. We wish you the very best of luck with your application and your future academic career."
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

// --- DOCUMENT VAULT LOGIC ---
document.getElementById('openVaultBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    const modal = document.getElementById('statusModal');
    const body = document.getElementById('statusModalBody');

    body.innerHTML = `
    <div id="vaultHeaderInfo" style="display: flex; gap: 40px; margin-bottom: 30px; text-align: left;">
        <p style='text-align:center; width: 100%;'>Loading Vault Data...</p>
    </div>
    <div id="vaultTableContainer" style="width: 100%; overflow-x: auto;"></div>
    `;
    modal.style.display = 'flex';

    // Real-time listener to check application status and documents
    onSnapshot(doc(db, "applications", user.uid), (docSnap) => {
        if (!docSnap.exists()) {
            body.innerHTML = "<p style='text-align:center;'>Please submit your application first to activate the vault.</p>";
            return;
        }

        const data = docSnap.data();
        const currentStatus = data.status1 || "pending";
        const savedDocs = data.documents || {};
        const isLocked = currentStatus !== "pending"; // Lock if NOT pending

        let vaultHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
            <tr style="border-bottom: 2px solid #eee; color: #1976d2; font-size: 0.75rem; text-transform: uppercase;">
                <th style="padding: 10px;">Document Name</th>
                <th style="padding: 10px;">Size</th>
                <th style="padding: 10px;">File Name</th>
                <th style="padding: 10px;">Action</th>
            </tr>
        </thead>
        <tbody style="font-size: 0.9rem;">
`;

         const filesToCheck = [
        { name: 'ID_Passport', label: 'ID / Passport' },
        { name: 'Birth_Certificate', label: 'Birth Certificate' },
        { name: 'Matric_Certificate', label: 'Matric Certificate' },
        { name: 'Grade_11_Results', label: 'Grade 11 Results' },
        { name: 'Transcripts', label: 'Academic Transcripts' },
        { name: 'Proof_of_Address', label: 'Proof of Residence' },
        { name: 'Sponsor_ID', label: 'Sponsor / Parent ID' }
    ];


            const docStatuses = data.documentStatuses || {}; // Get statuses
           filesToCheck.forEach(f => {
            const fileUrl = savedDocs[f.name];
            const fileSize = savedDocs[`${f.name}_size`] || "N/A";
            const hasFile = !!fileUrl;

            vaultHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 10px; font-weight: 600;">${f.label}</td>
                    <td style="padding: 12px 10px; color: #666;">${fileSize}</td>
                    <td style="padding: 12px 10px; font-size: 0.85rem;">
                    ${hasFile ? `<a href="${fileUrl}" target="_blank" style="color: #4a90e2; font-weight: 600; text-decoration: none;">${data.documents[`${f.name}_filename`] || 'View Document'}</a>` : '<span style="color: #d32f2f;">No File</span>'}
                    </td>
                </tr>
            `; 
        });

        vaultHTML += `</tbody></table></div>`;
        const s1 = data.step1 || {};
document.getElementById('vaultHeaderInfo').innerHTML = `
    <div>
        <span style="color: #888; font-size: 0.85rem;">Application ID:</span>
        <strong style="display: block;">${data.applicationId || 'N/A'}</strong>
    </div>
    <div>
        <span style="color: #888; font-size: 0.85rem;">Name:</span>
        <strong style="display: block;">${s1.fullNames || ''} ${s1.surname || ''}</strong>
    </div>
`;
document.getElementById('vaultTableContainer').innerHTML = vaultHTML + `</tbody></table>`;
    });
});

window.handleVaultUpload = function(docName) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const user = auth.currentUser;
        const storage = getStorage();
        const fileRef = ref(storage, `applications/${user.uid}/${docName}`);

        let toUpload = file;

        // Compression Logic: If > 200KB and is an image, compress it
        if (file.size > 200 * 1024 && file.type.startsWith('image/')) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(resolve => img.onload = resolve);
            const canvas = document.createElement('canvas');
            let quality = 0.7;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            toUpload = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
        } else if (file.size > 200 * 1024 && file.type === 'application/pdf') {
            alert("PDF is over 200KB. Please compress it manually before uploading.");
            return;
        }

        try {
            alert("Uploading and replacing old file...");
            const snapshot = await uploadBytes(fileRef, toUpload);
            const url = await getDownloadURL(snapshot.ref);
            
            // Update Firestore (This replaces the old URL and updates the size)
            const appRef = doc(db, "applications", user.uid);
            await updateDoc(appRef, {
                [`documents.${docName}`]: url,
                [`documents.${docName}_size`]: (toUpload.size / 1024).toFixed(1) + " KB",
                [`documentStatuses.${docName}`]: 'pending' 
            }, {merge: true});
            alert("Success! Document updated.");
        } catch (err) {
            console.error(err);
            alert("Upload failed.");
        }
    };
    fileInput.click();
};




