import { auth, db } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const tableBody = document.getElementById('applicationTableBody');
const filterCourse = document.getElementById('filterCourse');


let selectedAppId = null;
let currentAppId = null; // To track which student we are looking at
let activeSubFilter = 'all'; // Tracks Pending, Review, or Waiting


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
const totalApps = snapshot.size;
const acceptedCount = snapshot.docs.filter(d => ['uncon_accepted', 'prov_accepted', 'registered'].includes(d.data().status1)).length;
const rejectedCount = snapshot.docs.filter(d => d.data().status1 === 'rejected').length;

// ADD THIS LINE to define archivedCount (adjust logic if you have a specific 'archived' status)
const archivedCount = snapshot.docs.filter(d => d.data().status1 === 'archived').length; 

document.getElementById('newAppsCount').innerText = totalApps;
document.getElementById('acceptedCount').innerText = acceptedCount;
document.getElementById('rejectedCount').innerText = rejectedCount;
document.getElementById('archivedCount').innerText = archivedCount; // Now this will show '0' instead of [object]

        tableBody.innerHTML = ''; // Keep this line

    // ADD THIS BELOW:
    const tableHead = document.querySelector('table thead');
    if (activeTabFilter === 'accepted') {
        tableHead.innerHTML = `
            <tr>
                <th>Application ID</th>
                <th>Student Name</th>
                <th>Course Accepted</th>
                <th class="hide-mobile">Date Submitted</th>
                <th>Date Accepted</th>
                <th>Accepted By</th>
                <th>Action</th>
            </tr>`;
    } else if (activeTabFilter === 'rejected') {
    tableHead.innerHTML = `
    <tr>
    <th>Application ID</th>
    <th>Student Name</th>
    <th>Course 1 Declined</th>
    <th>Course 2 Declined</th>
    <th class="hide-mobile">Date Submitted</th>
    <th>Date Declined</th>
    <th>Declined By</th>
    <th>Action</th>
    </tr>`;
        
    } else {
        tableHead.innerHTML = `
            <tr>
                <th>Application ID</th>
                <th>Course 1</th>
                <th>Status 1</th>
                <th>Course 2</th>
                <th>Status 2</th>
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
        const docs = data.documents || {};
        const requiredDocs = ['idCopy', 'matricResults', 'proofOfAddress']; // Add your specific requirements here
        const uploadedCount = Object.keys(docs).length;
        const isComplete = uploadedCount >= requiredDocs.length; 
          
            // Map data from your Student Portal structure
            const s1 = data.step1 || {};
            const s2 = data.step2 || {}; 

            const studentName = s1.fullNames + " " + (s1.surname || "");
            const course = s2.choice1 || "Not Selected";
            const course2 = s2.choice2 || "Not Selected"; 
            const status1 = data.status1 || "pending";
            const status2 = data.status2 || "pending";
            const dateSub = data.lastUpdated ? new Date(data.lastUpdated.seconds * 1000).toLocaleDateString() : "N/A";
            const docLabel = isComplete ? "CD" : "MD";
            const btnClass = isComplete ? "background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9;" : "background: #ffebee; color: #c62828; border: 1px solid #ffcdd2;";
            
            // Format ID like the photo (APP23-001) using last 4 digits of UID
            const displayId = `APP-${id.substring(0, 5).toUpperCase()}`;

            // Status 2 Logic: If Status 1 isn't 'rejected', Status 2 is inactive (Grey)
            let status2HTML;
            const isStatus1Accepted = ["prov_accepted", "uncon_accepted"].includes(status1);

            if (status1 !== "rejected") {
            const reason = isStatus1Accepted ? "ST1 ACCEPTED" : "WAITING FOR ST1";
            status2HTML = `<span style="color: #999; font-size: 0.7rem; font-weight: 600; border: 1px solid #ddd; padding: 3px 6px; border-radius: 4px;">
                    <i class="fas fa-clock"></i> ${reason}</span>`;
            } else {
            // If Status 1 IS rejected, Status 2 becomes active and colored
            status2HTML = `<span class="status status-${status2}">${status2.toUpperCase()}</span>`;
            }

           const row = document.createElement('tr');
            
            // REPLACE YOUR OLD row.innerHTML WITH THIS:
            if (activeTabFilter === 'accepted') {
                row.innerHTML = `
                    <td><strong>${displayId}</strong></td>
                    <td>${studentName}</td>
                    <td>${course}</td>
                    <td class="hide-mobile">${dateSub}</td>
                    <td>${data.dateAccepted || 'N/A'}</td>
                    <td><span style="font-size: 0.8rem; color: #666;">${data.acceptedBy || 'Staff User'}</span></td>
                    <td>
                        <button class="view-btn" style="background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; cursor: not-allowed;">
                            VIEW
                        </button>
                    </td>
                `;
            }  else if (activeTabFilter === 'rejected') {
                  row.innerHTML = `
                  <td><strong>${displayId}</strong></td>
                  <td>${studentName}</td>
                  <td>${course}</td>
                  <td>${course2}</td>
                  <td class="hide-mobile">${dateSub}</td>
                  <td>${data.dateDeclined || 'N/A'}</td>
                  <td><span style="font-size: 0.8rem; color: #666;">${data.declinedBy || 'Staff User'}</span></td>
                  <td>
                  <button class="view-btn" style="background: #ffebee; color: #c62828; border: 1px solid #ffcdd2;">
                VIEW
                </button>
             </td>
           `;
            } else {
                row.innerHTML = `
                    <td><strong>${displayId}</strong></td>
                    <td>${course}</td>
                    <td><span class="status status-${status1}">${status1.toUpperCase()}</span></td>
                    <td>${course2}</td>
                    <td>${status2HTML}</td>
                    <td class="hide-mobile">${dateSub}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="view-btn" style="${btnClass}" onclick='showDetails("${id}", ${JSON.stringify(data).replace(/"/g, '&quot;')})'>
                                VIEW
                            </button>
                            <span style="font-size: 0.7rem; font-weight: 800; color: ${isComplete ? '#2e7d32' : '#c62828'}">${docLabel}</span>
                        </div>
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
function showDetails(id, data) {
    currentAppId = id;
    const modal = document.getElementById('appModal');
    const personalSection = document.getElementById('personalSection');
    const academicSection = document.getElementById('academicSection');
    const header = document.getElementById('modalStudentHeader'); // Make sure you added this ID in the HTML above
    const appDetailsSection = document.getElementById('appDetailsSection') || document.createElement('div');
    appDetailsSection.id = "appDetailsSection";
    appDetailsSection.style.display = "none";
   // Ensure this is appended to your modal body if it's a new element
   if(!document.getElementById('appDetailsSection')) personalSection.parentNode.appendChild(appDetailsSection);

    
    const s1 = data.step1 || {};
    const s2 = data.step2 || {};
    const displayId = `APP-${id.substring(0, 5).toUpperCase()}`;

    // Inject the Student Header (ID and Name on top, details on a new line below)
    header.innerHTML = `
    <div style="width: 100%;">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 10px;">
            ${displayId} &nbsp; ${s1.fullNames} ${s1.surname}
        </h2>
        <div style="display: flex; gap: 30px; color: #666; font-size: 0.9rem; flex-wrap: wrap;">
            <span><strong style="color: #999; text-transform: uppercase; font-size: 0.75rem;">ID Number</strong><br>${s1.idNumber || 'N/A'}</span>
            <span><strong style="color: #999; text-transform: uppercase; font-size: 0.75rem;">Cell Number</strong><br>${s1.mobile || 'N/A'}</span>
            <span><strong style="color: #999; text-transform: uppercase; font-size: 0.75rem;">Email</strong><br>${s1.email || 'N/A'}</span>
            <span><strong style="color: #999; text-transform: uppercase; font-size: 0.75rem;">Date Submitted</strong><br>${data.lastUpdated ? new Date(data.lastUpdated.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
        </div>
    </div>
`;

    // Helper to hide empty fields - if value is missing, it returns empty string
    const row = (label, value) => value ? `
        <div>
            <span style="color:#666; font-size: 0.75rem; display:block; text-transform: uppercase;">${label}</span>
            <span style="color:#333; font-weight: 500;">${value}</span>
        </div>` : '';

    personalSection.innerHTML = `
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
            
            academicSection.innerHTML = `
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


            appDetailsSection.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 30px;"> 
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px; background: #fafcfe;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">4. Programme Choices</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    ${row("Academic Year", s2.acadYear)}
                    ${row("Campus Selection", s2.campus)}
                    ${row("First Choice", s2.choice1)}
                    ${row("Second/Third Choice", s2.choice2)}
                    ${row("Need Student Accommodation", s2.housing)}
                    ${row("Need Financial Support", s2.nsfas)}
                </div>
            </div>
        </div>
    `;
  // Tab Switching Logic
    const tPers = document.getElementById('tabPersonal');
    const tAcad = document.getElementById('tabAcademic');
    const tApp = document.getElementById('tabAppDetails');

    const switchTab = (activeTab, activeSec) => {
        [personalSection, academicSection, appDetailsSection].forEach(s => s.style.display = 'none');
        [tPers, tAcad, tApp].forEach(t => { t.style.borderBottom = "none"; t.style.color = "#999"; });
        
        activeSec.style.display = 'block';
        activeTab.style.borderBottom = "3px solid #4a90e2";
        activeTab.style.color = "#4a90e2";

        document.getElementById('breadcrumbActive').innerText = activeTab.innerText;
    };

    tPers.onclick = () => switchTab(tPers, personalSection);
    tAcad.onclick = () => switchTab(tAcad, academicSection);
    tApp.onclick = () => switchTab(tApp, appDetailsSection);

    tPers.click(); 
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

// --- TAB SWITCHING LOGIC ---

const tabs = {
    new: document.getElementById('tabNew'),
    accepted: document.getElementById('tabAccepted'),
    rejected: document.getElementById('tabRejected'),
    archived: document.getElementById('tabArchived')
};

let activeTabFilter = 'all'; // Default to showing everything (New Apps)

function handleTabClick(selectedKey) {
    // 1. Update UI Styles (Active tab color)
    Object.values(tabs).forEach(tab => {
        tab.style.borderBottom = "none";
        tab.style.background = "#fff";
    });
    tabs[selectedKey].style.borderBottom = "3px solid #4a90e2";
    tabs[selectedKey].style.background = "rgba(74, 144, 226, 0.05)";

    // 2. Set the Filter Key (CRITICAL: Do this before loading)
    activeTabFilter = selectedKey;

// ADD THIS: Only show Sub-Nav if we are in the "New" tab
const sideNew = document.getElementById('sideNavNew');
const sideAcc = document.getElementById('sideNavAccepted');
const sideRej = document.getElementById('sideNavRejected');

// Show only the relevant sidebar section
sideNew.style.display = (selectedKey === 'new') ? 'block' : 'none';
sideAcc.style.display = (selectedKey === 'accepted') ? 'block' : 'none';
sideRej.style.display = (selectedKey === 'rejected') ? 'block' : 'none';
    
    activeSubFilter = 'all'; // Reset sub-filter when we change main tabs

    // 3. Re-run the listener to rebuild the table with the new headers
    loadApplications(); 
}

// Attach Event Listeners
tabs.new.onclick = () => handleTabClick('new');
tabs.accepted.onclick = () => handleTabClick('accepted');
tabs.rejected.onclick = () => handleTabClick('rejected');
tabs.archived.onclick = () => handleTabClick('archived');

// Update your existing applyFilters function to include the Tab logic
const applyFilters = () => {
    const statusDropdownVal = "all"; 
    const docsFilterVal = document.getElementById('filterDocs').value;
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        // Get the status from the hidden text or status pill in cell index 2
        const rowStatus = row.cells[2]?.innerText.toLowerCase().trim() || "";
        const rowCourse = row.cells[1]?.innerText.toLowerCase() || "";

        
// NEW LOGIC:
let matchTab = false;
if (activeTabFilter === 'new') {
    // If in New tab, check the sub-filter (All, Pending, Review, or Waiting)
    if (activeSubFilter === 'all') matchTab = true;
    else matchTab = rowStatus.includes(activeSubFilter);
} 
    else if (activeTabFilter === 'accepted') {
    if (activeSubFilter === 'all') {
        matchTab = ['prov_accepted', 'uncon_accepted', 'registered'].includes(rowStatus);
    } else {
        matchTab = (rowStatus === activeSubFilter);
    }
}
   else if (activeTabFilter === 'rejected') {
    if (activeSubFilter === 'all') {
        // Show anything that is a 'No', whether from system or student
        matchTab = ['rejected', 'rejected_both', 'withdrawn_expired', 'student_declined'].includes(rowStatus);
    } else {
        // Show specific reason (e.g., only show 'student_declined')
        matchTab = (rowStatus === activeSubFilter);
    }
}

else if (activeTabFilter === 'archived') matchTab = (rowStatus === 'archived');

// We removed the status dropdown, so we can set this to true
const matchDropdownStatus = true;
        // Check if row has CD or MD label
const docLabel = row.querySelector('span[style*="font-weight: 800"]')?.innerText || "";
const matchDocs = docsFilterVal === "all" || docLabel === docsFilterVal;

        // Final Visibility: Must match Tab AND Dropdowns
        if (matchTab && matchDocs) {
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

handleTabClick('new');

document.getElementById('sortDate').addEventListener('change', (e) => {
    const rows = Array.from(tableBody.querySelectorAll('tr:not(#noDataRow)'));
    const isNewest = e.target.value === 'newest';

    rows.sort((a, b) => {
        const dateA = new Date(a.cells[5].innerText);
        const dateB = new Date(b.cells[5].innerText);
        return isNewest ? dateB - dateA : dateA - dateB;
    });

    rows.forEach(row => tableBody.appendChild(row));
});

// Re-attach Document Filter listener
document.getElementById('filterDocs').addEventListener('change', applyFilters);

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
