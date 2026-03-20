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
                    ${row("Home Language", s1.language)}
                </div>
                
                <h4 style="font-size: 0.8rem; color: #999; margin-top: 20px; text-transform: uppercase;">Contact & Address</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; mt: 10px;">
                    ${row("Email", s1.email)}
                    ${row("Mobile Number", s1.mobile)}
                    ${row("Physical Address", `${s1.address?.street}, ${s1.address?.suburb}, ${s1.address?.province}, ${s1.address?.postalCode}`)}
                    ${row("Next of Kin", `${s1.nextOfKinName} (${s1.nextOfKinContact})`)}
                </div>

                ${s1.hasDisability === 'yes' ? `
                <div style="margin-top: 15px; padding: 10px; background: #fff5f5; border-radius: 4px;">
                    <strong style="font-size: 0.75rem; color: #c0392b;">DISABILITY INFO:</strong>
                    <p style="font-size: 0.9rem;">${s1.disabilities?.filter(d => d).join(', ')}</p>
                </div>` : ''}
            </div>

            <!-- 2. Academic History (Matric) -->
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">2. Education History</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    ${row("School Name", s2.schoolName)}
                    ${row("Matric Year", s2.matricYear)}
                    ${row("Qualification Type", s2.qualType)}
                    ${row("Total APS Score", s2.APS)}
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

            <!-- 3. Post-School Qualifications (If any) -->
            ${s2.prevQuals && s2.prevQuals.length > 0 ? `
            <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h3 style="color: #4a90e2; font-size: 1.1rem; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">3. Previous Qualifications</h3>
                ${s2.prevQuals.map((q, index) => `
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; ${index > 0 ? 'border-top: 1px dashed #eee; pt: 15px;' : ''}">
                        ${row("Institution", q.institution)}
                        ${row("Student Number", q.studentNum)}
                        ${row("Qualification", q.qualName)}
                        ${row("Average (%)", q.average)}
                        ${row("Status", q.status)}
                        ${row("Year", q.year)}
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


