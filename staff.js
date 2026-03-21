import { auth, db } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const tableBody = document.getElementById('applicationTableBody');
const filterCourse = document.getElementById('filterCourse');

let selectedAppId = null;
let currentAppId = null; // To track which student we are looking at


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
    tableBody.innerHTML = ''; // Always clear the table first

    if (snapshot.empty) {
        // If Firebase is empty, show this message instead of a blank screen
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 50px; color: #999;">
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
            const studentName = data.step1?.fullNames + " " + (data.step1?.surname || "");
            const course = data.step2?.choice1 || "Not Selected";
            const status = data.status || "pending";
            const dateSub = data.lastUpdated ? new Date(data.lastUpdated.seconds * 1000).toLocaleDateString() : "N/A";
            
            // Format ID like the photo (APP23-001) using last 4 digits of UID
            const displayId = `APP-${id.substring(0, 5).toUpperCase()}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${displayId}</strong></td>
                <td>${studentName}</td>
                <td>${course}</td>
                <td><span class="status status-${status}">${status.toUpperCase()}</span></td>
                <td>${dateSub}</td>
            `;

            row.onclick = () => showDetails(id, data);
            tableBody.appendChild(row);

        });
    });
}

// Professional Summary Modal Logic
function showDetails(id, data) {
    currentAppId = id; // Set the global ID
    const modal = document.getElementById('appModal');
    const body = document.getElementById('modalBody');
    
    // --- AUTOMATIC STATUS SYNC ---
    // If opening a 'pending' app, immediately change it to 'review' (Under Review)
    if (data.status === "pending") {
        updateAppStatus("review");
    }

    // Set the status dropdown to match the current status
    document.getElementById('updateStatusSelect').value = data.status || "pending";

    // --- DOCUMENT COUNT SYNC ---
    // Assuming documents are stored in data.documents (adjust based on your Firebase field)
    const docs = data.documents || {}; 
    const count = Object.keys(docs).length;
    document.getElementById('docCount').textContent = count;
    
    // Set Document Button click listener
    document.getElementById('docBtn').onclick = () => viewDocuments(docs);
    
    const s1 = data.step1 || {};
    const s2 = data.step2 || {};

    // Helper to hide empty fields - if value is missing, it returns empty string
    const row = (label, value) => value ? `
        <div>
            <span style="color:#666; font-size: 0.75rem; display:block; text-transform: uppercase;">${label}</span>
            <span style="color:#333; font-weight: 500;">${value}</span>
        </div>` : '';

    body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 30px;">
            
            <!-- 1. Personal Details Section -->
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">1. Personal Details</h3>
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

            <!-- 2. Academic History (Matric) -->
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">2. Education History</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    ${row("School Name", s2.schoolName)}
                    ${row("Qualification Type", s2.examBody)}
                    ${row("Matric Year", s2.matricYear)}
                    ${row("Year Complete / To be Completed", s2.yearCompleted)}
                    ${row("Total APS Score", s2.APS)}
                    ${row("Current Status", s2.matricStatus)}
                    ${row("Province", s2.schoolProvince)}
                    ${row("Country", s2.schoolCountry)}
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
${s2.prevQuals && s2.prevQuals.length > 0 ? `
<div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
    <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">3. Previous Qualifications</h3>
    ${s2.prevQuals.map((q, index) => `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; ${index > 0 ? 'border-top: 1px dashed #eee; padding-top: 15px;' : ''}">
            ${row("Institutional Name", q.institutionName)}
            ${row("Qualification Name", q.qualName)}
            ${row("Status", q.status)}
            ${row("Student Number", q.studentNum)}
            ${row("Module Percentage Average", q.average)}
            ${row("Year Completed / To be Completed", q.year)}
        </div>
    `).join('')}
</div>` : ''}


            <!-- 4. Programme Choices Section -->
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

// NEW FILTER LOGIC (Checks both Status and Course)
const applyFilters = () => {
    const statusVal = document.getElementById('filterStatus').value.toLowerCase();
    const courseVal = document.getElementById('filterCourse').value.toLowerCase();
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        // cells[2] is Course, cells[3] is Status
        const rowCourse = row.cells[2]?.innerText.toLowerCase() || "";
        const rowStatus = row.cells[3]?.innerText.toLowerCase().replace(/\s/g, '') || "";

        const matchStatus = statusVal === "all" || rowStatus.includes(statusVal.replace('_', ''));
        const matchCourse = courseVal === "all" || rowCourse.includes(courseVal);

        // Only show the row if BOTH filters match
        row.style.display = (matchStatus && matchCourse) ? '' : 'none';
    }
};

// Add the listeners once at the bottom
document.getElementById('filterStatus').addEventListener('change', applyFilters);
document.getElementById('filterCourse').addEventListener('change', applyFilters);

// Function to sync status changes to Firebase (Both Staff and Student see this)
async function updateAppStatus(newStatus) {
    if (!currentAppId) return;
    
    try {
        const appRef = doc(db, "applications", currentAppId);
        await updateDoc(appRef, {
            status: newStatus,
            lastUpdated: new Date() // Syncs the timestamp
        });
        console.log("Status synced to both portals: " + newStatus);
    } catch (error) {
        console.error("Error syncing status:", error);
    }
}

// Listener for the Manual Status Dropdown
document.getElementById('updateStatusSelect').addEventListener('change', (e) => {
    updateAppStatus(e.target.value);
});

// View Documents Logic
function viewDocuments(docs) {
    if (Object.keys(docs).length === 0) {
        alert("This student has not uploaded any documents yet.");
        return;
    }
    
    let list = "STUDENT DOCUMENTS:\n\n";
    Object.entries(docs).forEach(([name, url]) => {
        list += `- ${name.toUpperCase()}\n`;
    });
    
    // For a cleaner UI, you could build a small sub-modal here, 
    // but for now, we show the names and allow the "View" concept.
    alert(list + "\nTo view/download, use the main file links.");
}

window.downloadSummary = function(type) {
    if(type === 'pdf') {
        // This opens the browser print dialog
        // Because your modal is already longitudinal (Top-to-bottom), 
        // printing the 'modalBody' creates the professional document you need.
        const printContent = document.getElementById('modalBody').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = `
            <div style="padding: 40px; font-family: Arial, sans-serif;">
                <h1 style="text-align:center; border-bottom: 2px solid #333;">OFFICIAL STUDENT APPLICATION SUMMARY</h1>
                ${printContent}
            </div>`;
            
        window.print();
        document.body.innerHTML = originalContent;
        location.reload(); // Restore the dashboard
    } else {
        alert("Excel/Word export requires an external library (like SheetJS), but the PDF is ready!");
    }
};

window.editDetails = async function() {
    const newName = prompt("Enter corrected Full Names for this student:");
    
    if (newName && currentAppId) {
        try {
            const appRef = doc(db, "applications", currentAppId);
            // This updates the 'step1' object inside Firestore so the student sees the fix
            await updateDoc(appRef, {
                "step1.fullNames": newName,
                "lastUpdated": new Date()
            });
            alert("Success! The Student's portal has been updated with the new name.");
            location.reload(); 
        } catch (error) {
            console.error("Sync Error:", error);
            alert("Failed to sync change to student portal.");
        }
    }
};

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.btn-save')) {
        var dropdowns = document.getElementsByClassName("show");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.id === "actionDrop") {
                openDropdown.classList.remove('show');
            }
        }
    }
}


