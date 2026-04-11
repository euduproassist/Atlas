import { auth, db } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc, arrayUnion, deleteField } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const tableBody = document.getElementById('applicationTableBody');
const filterCourse = document.getElementById('filterCourse');


let selectedAppId = null;
let currentAppId = null; // To track which student we are looking at
let activeSubFilter = 'all'; // Tracks Pending, Review, or Waiting
let activeTabFilter = 'new'; 

// 1. Security Check: Ensure user is logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "staff-login.html";
        return;
    }

    // CRITICAL FIX: Verify staff status in the UI before querying
    const staffRef = doc(db, "staff", user.uid);
    const staffSnap = await getDoc(staffRef);
    
    if (staffSnap.exists()) {
        window.currentStaffName = staffSnap.data().fullName || "Staff";
    loadApplications();
    setupProfile(user);

} else {
    console.warn("Security: UID", user.uid, "not found in staff collection.");
    auth.signOut();
}

});

// 2. Real-time Listener for Applications (Connects to 'applications' collection)
function loadApplications() {
    // We order by lastUpdated to show newest first, matching your 'Sort: Newest' UI
    const q = query(collection(db, "applications"), orderBy("lastUpdated", "desc"));

onSnapshot(q, (snapshot) => {
const newAppsCount = snapshot.docs.filter(d => ['pending', 'review', 'waiting'].includes(d.data().status1)).length;
const acceptedCount = snapshot.docs.filter(d => ['uncon_accepted', 'registered', 'deregistered'].includes(d.data().status1)).length;
const rejectedCount = snapshot.docs.filter(d => ['rejected', 'withdrawn_expired'].includes(d.data().status1)).length;
const archivedCount = snapshot.docs.filter(d => d.data().status1 === 'archived').length; 

document.getElementById('newAppsCount').innerText = newAppsCount;
document.getElementById('acceptedCount').innerText = acceptedCount;
document.getElementById('rejectedCount').innerText = rejectedCount;
document.getElementById('archivedCount').innerText = archivedCount;

        tableBody.innerHTML = ''; // Keep this line

    // ADD THIS BELOW:
    const tableHead = document.querySelector('table thead');
    if (activeTabFilter === 'accepted') {
        tableHead.innerHTML = `
            <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Course Accepted</th>
                <th class="hide-mobile">Date Submitted</th>
                <th>Action</th>
            </tr>`;
    } else if (activeTabFilter === 'rejected') {
    tableHead.innerHTML = `
    <tr>
    <th>Application ID</th>
    <th>Student Name</th>
    <th>Course Declined</th>
    <th class="hide-mobile">Date Submitted</th>
    <th>Action</th>
    </tr>`;
        
    } else {
        tableHead.innerHTML = `
            <tr>
                <th style="display: flex; align-items: center; gap: 10px;">
                <button id="sidebarToggle" style="background: none; border: none; cursor: pointer; color: var(--primary); font-size: 1rem;">
                <i class="fas fa-chevron-left" id="toggleIcon"></i>
                </button>
                Application ID
                </th>                
                <th>Course</th>
                <th>Status</th>
                <th class="hide-mobile">Date Submitted</th>
                <th>Action</th>
            </tr>`;
    }


    if (snapshot.empty) {
        // If Firebase is empty, show this message instead of a blank screen
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 50px; color: #999;">
                    <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    No student applications have been submitted yet.
                </td>
            </tr>
        `;
        return;
    }

    // If there IS data, loop through and build the rows
    snapshot.forEach((doc) => {
        const data = doc.data(); 
        const id = doc.id;
          
            // Map data from your Student Portal structure
            const s1 = data.step1 || {};
            const s2 = data.step2 || {}; 

            const studentName = s1.fullNames + " " + (s1.surname || "");
            const course = s2.choice1 || "Not Selected";
            const status1 = data.status1 || "pending";
            const dateSub = data.lastUpdated ? new Date(data.lastUpdated.seconds * 1000).toLocaleDateString() : "N/A";
            const displayId = data.applicationId;
            if (!displayId) {
            console.error("System Error: Application found without a generated ID for Student:", studentName);
              }

           const row = document.createElement('tr');
           row.setAttribute('data-status', status1.toLowerCase());
            
            // REPLACE YOUR OLD row.innerHTML WITH THIS:
            if (activeTabFilter === 'accepted') {
                row.innerHTML = `
                    <td><strong>${data.studentNumber || '<span style="color:red">No Student Number</span>'}</strong></td>
                    <td>${studentName}</td>
                    <td>${course}</td>
                    <td class="hide-mobile">${data.submittedAt ? new Date(data.submittedAt.seconds * 1000).toLocaleDateString() : dateSub}</td>                    <td>
                    <button class="view-btn" style="background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; cursor: pointer;" onclick='showDetails("${id}", ${JSON.stringify(data).replace(/"/g, '&quot;')})'>
                    VIEW
                    </button>
                    </td>
                `;
                }  else if (activeTabFilter === 'rejected') {
                     row.innerHTML = `
                     <td><strong>${displayId}</strong></td>
                     <td>${studentName}</td>
                     <td>${course}</td>
                     <td class="hide-mobile">${data.submittedAt ? new Date(data.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                     <td>
                  <button class="view-btn" style="background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; cursor: pointer;" onclick='showDetails("${id}", ${JSON.stringify(data).replace(/"/g, '&quot;')})'>
              VIEW
             </button>
             </td>
           `;
            } else {
                    row.innerHTML = `
                    <td><strong>${displayId}</strong></td>
                    <td>${course}</td>
                    <td>
                   <span class="status status-${status1}">
                        ${status1 === 'review' ? 'UNDER REVIEW' : 
                        status1 === 'waiting' ? 'WAITING LIST' : 
                        status1.toUpperCase()}
                       </span>
                    </td>
                    <td class="hide-mobile">${dateSub}</td>
                    <td>
    <button class="view-btn" style="background: #f0f0f0; color: #333; border: 1px solid #ddd;" onclick='showDetails("${id}", ${JSON.stringify(data).replace(/"/g, '&quot;')})'>
        VIEW
    </button>
</td>                  
                `;
            }

            tableBody.appendChild(row);
        });
        applyFilters();
    });
}

window.showDetails = showDetails;

// Professional Summary Modal Logic
async function showDetails(id, data) {
    currentAppId = id;
    const appRef = doc(db, "applications", id);
    
    // 1. Prepare the log
    const logEntry = {
        staffName: window.currentStaffName || "Staff",
        action: "Viewed Application",
        date: new Date().toLocaleString(),
        timestamp: new Date()
    };

    // 2. Prepare Payload
    let updatePayload = {
        actionHistory: arrayUnion(logEntry)
    };

    // CRITICAL: Force the change from 'pending' to 'review'
    if (data.status1 === 'pending') {
        updatePayload.status1 = 'review';
        updatePayload.lastUpdated = new Date();
        
        // Optimistic UI: Update the local data object so the modal reflects it immediately
        data.status1 = 'review'; 
    }

    // 3. Execute Update
    try {
        await updateDoc(appRef, updatePayload);
        // Because loadApplications() uses onSnapshot, the table will auto-refresh 
        // to "UNDER REVIEW" in the background while the modal is open.
    } catch (err) {
        console.error("Auto-Review Update Failed:", err);
    }

    const modal = document.getElementById('appModal');
    const displayId = data.applicationId;
if (!displayId) {
    console.error("System Error: Application found without a generated ID for Student:", studentName);
}
    const s1 = data.step1 || {};
    const s2 = data.step2 || {};

    // Update Sidebar Header
    const isAdmissions = ['uncon_accepted', 'registered', 'deregistered'].includes(data.status1);
document.getElementById('modalIdBadge').innerHTML = `
    ID: ${displayId} 
    ${isAdmissions ? `<br><span style="color:#2e7d32">Student No: ${data.studentNumber || 'Not Assigned'}</span>` : ''}
`;
document.getElementById('modalStudentName').innerText = `${s1.fullNames} ${s1.surname}`;

    // Define Sections
    const secPers = document.getElementById('sec-personal');
    const secAcad = document.getElementById('sec-academic');
    const secDocs = document.getElementById('sec-documents');
    const secApp = document.getElementById('sec-application');
    const secHistory = document.getElementById('sec-history');

    // Helper to hide empty fields - if value is missing, it returns empty string
    const row = (label, value) => value ? `
        <div>
            <span style="color:#666; font-size: 0.75rem; display:block; text-transform: uppercase;">${label}</span>
            <span style="color:#333; font-weight: 500;">${value}</span>
        </div>` : '';

    secPers.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 30px;">          
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">Personal Details</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    ${row("Full Names", s1.fullNames)}
                    ${row("Gender", s1.gender)}
                    ${row("Surname", s1.surname)}
                    ${row("Title", s1.title)}
                    ${row("ID / Passport Number", s1.idNumber)}
                    ${row("Date of Birth", s1.dob)}
                    ${row("Nationality", s1.nationality)}
                    ${row("Home Language", s1.homeLanguage)}
                </div>

                 <h4 style="font-size: 0.8rem; color: #999; margin-top: 20px; text-transform: uppercase;">Equity & Status</h4>
                 <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 10px;">
                 ${row("Race", s1.race)}
                 ${row("Marital Status", s1.marital)}
                 ${row("Employment", s1.employment)}
                 ${row("Social Grant", s1.socialGrant)}
                 ${row("Citizenship Status", s1.citizenship)}
                </div>
                
                <h4 style="font-size: 0.8rem; color: #999; margin-top: 20px; text-transform: uppercase;">Contact & Address</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; mt: 10px;">
                    ${row("Email", s1.email)}
                    ${row("Mobile Number", s1.mobile)}
                    ${row("Alternative Number", s1.altPhone)}
                    ${row("Physical Address", s1.address ? `${s1.address.street}, ${s1.address.suburb}, ${s1.address.province}, ${s1.address.postalCode}, ${s1.address.country}` : '')}
                    ${s1.postalAddress ? row("Postal Address", `${s1.postalAddress.street}, ${s1.postalAddress.suburb}, ${s1.postalAddress.province}, ${s1.postalAddress.postalCode}, ${s1.postalAddress.country}`) : ''}
                    ${row("Next of Kin", s1.nokName ? `${s1.nokName} (${s1.nokRelation}) - ${s1.nokPhone}` : '')}
                </div>

           ${s1.disability === 'Yes' ? `
           <div style="margin-top: 15px; padding: 10px; background: #fff5f5; border-radius: 4px; border-left: 4px solid #e74c3c;">
           <strong style="font-size: 0.75rem; color: #c0392b; text-transform: uppercase;">Disability Information:</strong>
           <p style="font-size: 0.92rem; color: #333; margin-top: 5px;">
            ${s1.disabilityDetails && s1.disabilityDetails.length > 0 ? s1.disabilityDetails.join(', ') : 'Yes - Details not specified'}
            </p>
            </div>` : ''}
            </div>
            </div>
            `;
            
            secAcad.innerHTML = `
               <div style="display: flex; flex-direction: column; gap: 30px;"> 
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">1. Education History</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    ${row("School Name", s2.schoolName)}
                    ${row("Qualification Type", s2.examBody)}
                    ${row("Year Complete / To be Completed", s2.matricYear)}
                    ${row("Total APS Score", s2.APS)}
                    ${row("Current Status", s2.currentStatus)}
                    ${row("Province", s2.schoolProvince)}
                    ${row("Country", s2.schoolCountry)}
                    ${row("NBT Registration Number", s2.nbtNum)} 
                </div>

                <div style="background: #f9f9f9; padding: 15px; border-radius: 6px;">
                    <span style="color:#666; font-size: 0.75rem; display:block; margin-bottom: 10px; text-transform: uppercase;">Matric Subjects</span>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        ${s2.subjects ? s2.subjects.map(s => `
                            <div style="font-size: 0.85rem; border-left: 3px solid #4a90e2; padding-left: 8px;">
                                <strong>${s.name}</strong><br>${s.percentage}% (Level ${s.level})
                            </div>
                        `).join('') : '<p>No subjects entered</p>'}
                    </div>
                </div>
            </div>

            <!-- 3. Post-School Qualifications -->
${s2.postSchoolQualifications && s2.postSchoolQualifications.length > 0 ? `
<div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
    <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">2. Previous Qualifications</h3>
    ${s2.postSchoolQualifications.map((q, index) => `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; ${index > 0 ? 'border-top: 1px dashed #eee; padding-top: 15px;' : ''}">
            ${row("Institutional Name", q.institutionalName)}
            ${row("Qualification Name", q.qualificationName)}
            ${row("Status", q.status)}
            ${row("Student Number", q.studentNumber)}
            ${row("Avg Percentage", q.modulePercentageAverage + '%')}
            ${row("Year", q.yearCompleted)}
        </div>
    `).join('')}
</div>` : ''}
</div>`;

    secApp.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 30px;"> 
        <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px; background: #fafcfe;">
            <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">4. Programme Choices</h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                ${row("Academic Year", s2.acadYear)}
                ${row("Campus Selection", s2.campus)}
                ${row("Course Selection", s2.choice1)}
                ${row("Need Student Accommodation", s2.housing)}
                ${row("Need Financial Support", s2.nsfas)}
            </div>

            <div style="border-top: 1px solid #eee; pt: 20px; margin-top: 10px;">
                <h4 style="font-size: 0.75rem; color: #999; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Admission Decision</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e1e4e8;">
                        <span style="font-size: 0.65rem; color: #666; text-transform: uppercase; font-weight: 700;">Application Status</span>
                        <select id="updateStatus1" style="width: 100%; margin-top: 10px; padding: 8px; border-radius: 4px; border: 1px solid #ddd; font-weight: 600; font-size: 0.8rem;">
                            <option value="waiting" ${data.status1 === 'waiting' ? 'selected' : ''}>Waiting List</option>
                            <option value="uncon_accepted" ${data.status1 === 'uncon_accepted' ? 'selected' : ''}>Accepted</option>
                            <option value="rejected" ${data.status1 === 'rejected' ? 'selected' : ''}>Rejected</option>
                            <option value="withdrawn_expired" ${data.status1 === 'withdrawn_expired' ? 'selected' : ''}>Withdrawn/Expired</option>
                            <option value="registered" ${data.status1 === 'registered' ? 'selected' : ''}>Registered</option>
                            <option value="deregistered" ${data.status1 === 'deregistered' ? 'selected' : ''}>Deregistered</option>
                        </select>
                    </div>

                <button onclick="saveStatusUpdate()" style="width: 100%; background: #4a90e2; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px; font-size: 0.8rem;">
                    UPDATE STATUS
                </button>
            </div>
        </div>
    </div>
`;

    // UPDATED CODE:
const savedDocs = data.documents || {};
const filesToCheck = [
    { name: 'ID_Passport', label: 'ID / Passport' },
    { name: 'Birth_Certificate', label: 'Birth Certificate' },
    { name: 'Matric_Certificate', label: 'Matric Certificate' },
    { name: 'Grade_11_Results', label: 'Grade 11 Results' },
    { name: 'Transcripts', label: 'Academic Transcripts' },
    { name: 'Proof_of_Address', label: 'Proof of Residence' },
    { name: 'Sponsor_ID', label: 'Sponsor / Parent ID' }
];

let vaultHTML = `
    <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">Document Vault</h3>
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
            <tr style="border-bottom: 2px solid #eee; color: #1976d2; font-size: 0.75rem; text-transform: uppercase;">
                <th style="padding: 10px;">Document Name</th>
                <th style="padding: 10px;">Size</th>
                <th style="padding: 10px;">File Name</th>
                <th style="padding: 10px;">Action</th>
            </tr>
        </thead>
        <tbody style="font-size: 0.9rem;">`;

filesToCheck.forEach(f => {
    const fileUrl = savedDocs[f.name];
    const fileSize = savedDocs[`${f.name}_size`] || "N/A";
    const fileName = savedDocs[`${f.name}_filename`] || (fileUrl ? 'Uploaded File' : 'No File');
    const hasFile = !!fileUrl;
    const currentDocStatus = (data.documentStatuses && data.documentStatuses[f.name]) || (hasFile ? 'uploaded' : 'missing');

vaultHTML += `
    <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 10px; font-weight: 600;">${f.label}</td>
        <td style="padding: 12px 10px; color: #666;">${fileSize}</td>
        <td style="padding: 12px 10px;">
            ${hasFile ? `<a href="${fileUrl}" target="_blank" style="color: #4a90e2; font-weight: 600; text-decoration: none;">${fileName}</a>` : `<span style="color: #d32f2f;">${fileName}</span>`}
        </td>
        <td style="padding: 12px 10px;">
            <select class="doc-action-select" data-docname="${f.name}" onchange="document.getElementById('saveVaultChanges').style.display='block'" style="font-size:0.75rem; padding:4px; border-radius:4px;">
                <option value="" disabled selected>Select Action</option>
                ${hasFile ? `
                    <option value="processed" ${currentDocStatus === 'processed' ? 'selected' : ''}>Processed</option>
                    <option value="blurry">Blurry or unreadable</option>
                    <option value="expired">Expired document</option>
                    <option value="old">Document is older than 3 months</option>
                    <option value="format">Incorrect file format</option>
                    <option value="invalid">Invalid document</option>
                ` : `
                    <option value="missing" ${currentDocStatus === 'missing' ? 'selected' : ''}>Missing Documents</option>
                `}
            </select>
        </td>
    </tr>`;
});

    secDocs.innerHTML = vaultHTML + `</tbody></table>
<div id="saveVaultChanges" style="display:none; margin-top:20px; text-align:right;">
    <button onclick="updateVaultStatuses()" style="background:#27ae60; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:700; cursor:pointer;">UPDATE DOCUMENTS</button>
</div>`;

    const historyData = data.actionHistory || [];
    secHistory.innerHTML = `
        <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">Action History</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${historyData.length > 0 ? historyData.reverse().map(h => `
                <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr; padding: 12px; background: #fdfdfd; border: 1px solid #eee; border-radius: 6px; font-size: 0.8rem;">
                    <span style="font-weight: 700; color: #333;">${h.action}</span>
                    <span style="color: #666;"><i class="fas fa-user-tie"></i> ${h.staffName}</span>
                    <span style="color: #999; text-align: right;">${h.date}</span>
                </div>
            `).join('') : '<p style="text-align:center; color:#999; padding:20px;">No history recorded yet.</p>'}
        </div>
    `;

  // Tab Switching Logic
    const tPers = document.getElementById('tabPersonal');
    const tAcad = document.getElementById('tabAcademic');
    const tApp = document.getElementById('tabAppDetails');

    // Global function to switch sections inside the modal
    window.switchModalTab = (tabName) => {
        // Hide all sections
        document.querySelectorAll('.modal-section').forEach(s => s.style.display = 'none');
        // Deactivate all nav items
        document.querySelectorAll('.mod-nav-item').forEach(n => n.classList.remove('active'));

        // Show selected
        document.getElementById('sec-' + tabName).style.display = 'block';
        document.getElementById('nav-' + tabName).classList.add('active');
    };

    switchModalTab('personal'); // Default view
    modal.style.display = 'flex';
}


// 5. Simple Search Implementation
document.getElementById('searchInput').addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    const rows = tableBody.getElementsByTagName('tr');
    for (let row of rows) {
        row.style.display = row.innerText.toLowerCase().includes(filter) ? '' : 'none';
    }
});

// Update your existing applyFilters function to include the Tab logic
const applyFilters = () => {
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        // Get the status from the hidden text or status pill in cell index 2
        const rowStatus = row.getAttribute('data-status') || "";
        const rowCourse = row.cells[1]?.innerText.toLowerCase() || "";

        
// NEW LOGIC:
let matchTab = false;

if (activeTabFilter === 'new') {
    // Only show if status is one of the "New" types
    const isNewType = ['pending', 'review', 'waiting'].includes(rowStatus);
    if (activeSubFilter === 'all') {
        matchTab = isNewType;
    } else {
        matchTab = (rowStatus === activeSubFilter);
    }
} 
else if (activeTabFilter === 'accepted') {
    // Only show if status is one of the "Admissions" types
    const isAcceptedType = ['uncon_accepted', 'registered', 'deregistered'].includes(rowStatus);
    if (activeSubFilter === 'all') {
        matchTab = isAcceptedType;
    } else {
        matchTab = (rowStatus === activeSubFilter);
    }
}
else if (activeTabFilter === 'rejected') {
    // Only show if status is one of the "Declined" types
    const isDeclinedType = ['rejected', 'withdrawn_expired'].includes(rowStatus);
    if (activeSubFilter === 'all') {
        matchTab = isDeclinedType;
    } else {
        matchTab = (rowStatus === activeSubFilter);
    }
}
else if (activeTabFilter === 'archived') {
    matchTab = (rowStatus === 'archived');
}

// We removed the status dropdown, so we can set this to true
const matchDropdownStatus = true;

        // Final Visibility: Must match Tab AND Dropdowns
        if (matchTab) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }

    // ADD THIS AT THE VERY END OF applyFilters function
    const existingNoData = document.getElementById('noDataRow');
    if (existingNoData) existingNoData.remove();

    // Check if any rows are actually visible
    const visibleRows = Array.from(rows).filter(r => r.style.display !== 'none');
    
    if (visibleRows.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.id = 'noDataRow';
        const message = activeTabFilter === 'accepted' 
            ? "No students have been admitted yet. Accepted students will appear here." 
            : "No applications found in this section.";
            
        noDataRow.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 60px; color: #999;">
                <i class="fas fa-user-graduate" style="font-size: 2.5rem; display: block; margin-bottom: 15px; opacity: 0.5;"></i>
                <p style="font-weight: 500;">${message}</p>
            </td>
        `;
        tableBody.appendChild(noDataRow);
    }
};

// Initialization Logic on Page Load
document.addEventListener('DOMContentLoaded', () => {
    const savedTab = localStorage.getItem('lastTab') || 'new';
    const savedSub = localStorage.getItem('lastSub') || 'all';
    
    // Open the folder containing the saved sub-filter
    const folderMap = { 'new': 'sideNavNew', 'accepted': 'sideNavAccepted', 'rejected': 'sideNavRejected', 'archived': 'sideNavArchived' };
    if (folderMap[savedTab]) {
        document.getElementById(folderMap[savedTab]).style.display = 'block';
    }

    // Load the table data
    activeTabFilter = savedTab;
    activeSubFilter = savedSub;
    loadApplications();
    
    // Manually add the active-link class to the correct sub-tab
    // We use a timeout to ensure the DOM is fully ready
    setTimeout(() => {
        const subTabs = document.querySelectorAll('.sub-tab');
        subTabs.forEach(tab => {
            if (tab.getAttribute('onclick').includes(`'${savedSub}'`) && 
                tab.getAttribute('onclick').includes(`'${savedTab}'`)) {
                tab.classList.add('active-link');
            }
        });
    }, 100);
});

// Add 'e' as a parameter
window.setSubFilter = (val, parentTab, e) => {
    activeTabFilter = parentTab;
    activeSubFilter = val;
    
    localStorage.setItem('lastTab', parentTab);
    localStorage.setItem('lastSub', val);

    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active-link'));

    // Use 'e' instead of 'event'
    if (e && e.currentTarget) {
        e.currentTarget.classList.add('active-link');
    }
    
    loadApplications(); 
};

document.getElementById('sortDate').addEventListener('change', (e) => {
    const rows = Array.from(tableBody.querySelectorAll('tr:not(#noDataRow)'));
    const isNewest = e.target.value === 'newest';

    rows.sort((a, b) => {
        const dateA = new Date(a.querySelector('.hide-mobile')?.innerText || 0);
        const dateB = new Date(b.querySelector('.hide-mobile')?.innerText || 0);

        return isNewest ? dateB - dateA : dateA - dateB;
    });

    rows.forEach(row => tableBody.appendChild(row));
});

function setupProfile(user) {
    const trigger = document.getElementById('profileTrigger');
    const overlay = document.getElementById('profileOverlay');
    const emailDisp = document.getElementById('staffEmailDisplay');

    trigger.onclick = () => {
        emailDisp.innerText = user.email;
        overlay.style.display = 'flex';
    };

    document.getElementById('btnResetPass').onclick = () => {
        sendPasswordResetEmail(auth, user.email)
            .then(() => alert("Reset link sent to " + user.email))
            .catch(err => alert(err.message));
    };

    document.getElementById('btnLogout').onclick = () => {
        if(confirm("Logout of management portal?")) {
            signOut(auth).then(() => window.location.href = "staff-login.html");
        }
    };
}

window.toggleFolder = (sectionId) => {
    const target = document.getElementById(sectionId);
    const arrow = event.currentTarget.querySelector('.arrow');
    
    // Toggle visibility without closing others or changing the table
    if (target.style.display === 'none' || target.style.display === '') {
        target.style.display = 'block';
        if(arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        target.style.display = 'none';
        if(arrow) arrow.style.transform = 'rotate(-90deg)';
    }
};

/* Update the sidebarToggle listener at the bottom of staff.js */
document.addEventListener('click', (e) => {
    if (e.target.closest('#sidebarToggle')) {
        const sidebar = document.querySelector('.sidebar-menu');
        const icon = document.getElementById('toggleIcon');
        
        sidebar.classList.toggle('collapsed');
        
        // Flip the arrow based on state
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
    }
});

window.saveStatusUpdate = async () => {
    const s1Value = document.getElementById('updateStatus1').value;
    const btn = event.currentTarget || event.target;

    try {
        btn.innerText = "UPDATING...";
        btn.disabled = true;

        // 1. Get the latest data for this specific application first
        const appRef = doc(db, "applications", currentAppId);
        const appSnap = await getDoc(appRef);
        
        if (!appSnap.exists()) {
            throw new Error("Application document not found in database.");
        }
        
        const currentData = appSnap.data();

        const isAdmissionStatus = ['uncon_accepted', 'registered'].includes(s1Value);
        const isDeclinedStatus = ['rejected', 'withdrawn_expired'].includes(s1Value);

        // 2. Logic for Student Number
        let studentNum = currentData.studentNumber || null; 

        if (isAdmissionStatus && !studentNum) {
            studentNum = prompt("Enter the Student Number for this applicant:");
            // If they cancel or leave it blank, stop the update
            if (!studentNum) {
                alert("Update cancelled. A student number is required for acceptance.");
                btn.innerText = "UPDATE STATUS";
                btn.disabled = false;
                return; 
            }
        }

        // 3. Perform the update
        const statusMap = {
            'uncon_accepted': 'Accepted',
            'registered': 'Registered',
            'deregistered': 'Deregistered',
            'rejected': 'Rejected',
            'withdrawn_expired': 'Withdrawn/Expired',
            'waiting': 'Waiting List'
        };

        const historyLog = {
            staffName: window.currentStaffName || "Staff",
            action: `Status changed to: ${statusMap[s1Value] || s1Value}`,
            date: new Date().toLocaleString(),
            timestamp: new Date()
        };

        await updateDoc(appRef, {
            status1: s1Value,
            lastUpdated: new Date(),
            actionHistory: arrayUnion(historyLog),
            ...(isAdmissionStatus && { studentNumber: studentNum }),
            processedBy: auth.currentUser.email
        });

        alert("Application status updated successfully.");
        document.getElementById('appModal').style.display = 'none';

    } catch (error) {
        // --- THIS SECTION SHOWS THE ERROR IN YOUR CONSOLE ---
        console.error("--- STATUS UPDATE ERROR ---");
        console.error("Message:", error.message);
        console.error("Stack Trace:", error.stack);
        console.error("Application ID:", currentAppId);
        
        alert("Error: " + error.message + ". Check console for details.");
    } finally {
        btn.innerText = "UPDATE STATUS";
        btn.disabled = false;
    }
};

window.updateVaultStatuses = async () => {
    const selects = document.querySelectorAll('.doc-action-select');
    const appRef = doc(db, "applications", currentAppId);
    let updates = {};
    let deletePaths = [];

    selects.forEach(sel => {
        const action = sel.value;
        const docName = sel.dataset.docname;
        if (!action) return;

        if (['blurry', 'expired', 'old', 'format', 'invalid'].includes(action)) {
            // Mark for deletion in Firestore and Storage
            updates[`documents.${docName}`] = deleteField();
            updates[`documents.${docName}_filename`] = deleteField();
            updates[`documents.${docName}_size`] = deleteField();
            updates[`documentStatuses.${docName}`] = 'rejected';
            deletePaths.push(`applications/${currentAppId}/${docName}`);
        } else {
            updates[`documentStatuses.${docName}`] = action;
        }
    });

    try {
        await updateDoc(appRef, updates);
        // Handle physical file deletion in Storage
        const { getStorage, ref, deleteObject } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js");
        const storage = getStorage();
        for (const path of deletePaths) {
            try { await deleteObject(ref(storage, path)); } catch(e) { console.warn("File already gone or error:", e); }
        }
        alert("Documents updated successfully.");
        document.getElementById('saveVaultChanges').style.display = 'none';
    } catch (err) { alert("Error: " + err.message); }
};

