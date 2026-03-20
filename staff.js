import { auth, db } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const tableBody = document.getElementById('applicationTableBody');
const detailsSection = document.getElementById('detailsSection');
const detailsContent = document.getElementById('detailsContent');
const staffNoteInput = document.getElementById('staffNote');
const filterCourse = document.getElementById('filterCourse');

const saveNoteBtn = document.getElementById('saveNoteBtn');

let selectedAppId = null;

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

            row.onclick = () => showDetails(id, data, displayId);
            tableBody.appendChild(row);

        });
    });
}

// Professional Summary Modal Logic
function showDetails(id, data) {
    const modal = document.getElementById('appModal');
    const body = document.getElementById('modalBody');
    
    const s1 = data.step1 || {};
    const s2 = data.step2 || {};

    // Building the summary sections
    body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            
            <!-- Section 1: Personal -->
            <div>
                <h3 style="font-size: 0.85rem; color: #4a90e2; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">BIOGRAPHICAL DETAILS</h3>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">Full Names & Surname</strong> ${s1.fullNames} ${s1.surname}</p>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">ID / Passport Number</strong> ${s1.idNumber}</p>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">Date of Birth & Gender</strong> ${s1.dob} (${s1.gender})</p>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">Nationality</strong> ${s1.nationality}</p>
            </div>

            <!-- Section 2: Contact -->
            <div>
                <h3 style="font-size: 0.85rem; color: #4a90e2; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">CONTACT & RESIDENCY</h3>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">Email Address</strong> ${s1.email}</p>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">Mobile Number</strong> ${s1.mobile}</p>
                <p style="margin-bottom: 8px;"><strong style="color:#666; font-size: 0.8rem; display:block;">Physical Address</strong> ${s1.address?.street}, ${s1.address?.suburb}, ${s1.address?.province}, ${s1.address?.postalCode}</p>
            </div>

            <!-- Section 3: Academic -->
            <div style="grid-column: span 2;">
                <h3 style="font-size: 0.85rem; color: #4a90e2; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">ACADEMIC QUALIFICATIONS</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <p><strong>School:</strong><br>${s2.schoolName} (${s2.matricYear})</p>
                    <p><strong>APS Score:</strong><br><span style="font-size: 1.5rem; font-weight: bold; color: #333;">${s2.APS || '0'}</span></p>
                    <p><strong>Subjects:</strong><br>${s2.subjects ? s2.subjects.map(s => `${s.name} (${s.percentage}%)`).join(', ') : 'No subjects listed'}</p>
                </div>
            </div>

            <!-- Section 4: Choices -->
            <div style="grid-column: span 2; background: #f0f7ff; padding: 20px; border-radius: 4px;">
                <h3 style="font-size: 0.85rem; color: #4a90e2; margin-bottom: 10px;">PROGRAMME SELECTION</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <p><strong>First Choice:</strong> ${s2.choice1}</p>
                    <p><strong>Second Choice:</strong> ${s2.choice2 || 'None'}</p>
                    <p><strong>Campus & Year:</strong> ${s2.campus} - ${s2.acadYear}</p>
                    <p><strong>Accommodation Needed:</strong> ${s2.housing || 'No'}</p>
                </div>
            </div>
        </div>
    `;

    // Show the modal
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


