import { auth, db } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const tableBody = document.getElementById('applicationTableBody');
const detailsSection = document.getElementById('detailsSection');
const detailsContent = document.getElementById('detailsContent');
const staffNoteInput = document.getElementById('staffNote');
const saveNoteBtn = document.getElementById('saveNoteBtn');

let selectedAppId = null;

// 1. Security Check: Ensure user is logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "staff-login.html";
    } else {
        loadApplications();
    }
});

// 2. Real-time Listener for Applications (Connects to 'applications' collection)
function loadApplications() {
    // We order by lastUpdated to show newest first, matching your 'Sort: Newest' UI
    const q = query(collection(db, "applications"), orderBy("lastUpdated", "desc"));

            
            // Map data from your Student Portal structure
            const studentName = data.step1?.fullNames + " " + (data.step1?.surname || "");
            const studentNumber = data.step1?.idNumber || "N/A";
            const course = data.step2?.choice1 || "Not Selected";
            const status = data.status || "pending";
            const dateSub = data.lastUpdated ? new Date(data.lastUpdated.seconds * 1000).toLocaleDateString() : "N/A";
            
            // Format ID like the photo (APP23-001) using last 4 digits of UID
            const displayId = `APP-${id.substring(0, 5).toUpperCase()}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${displayId}</strong></td>
                <td>${studentName}</td>
                <td>${studentNumber}</td>
                <td>${course}</td>
                <td><span class="status status-${status}">${status.toUpperCase()}</span></td>
                <td>${dateSub}</td>
            `;

            row.onclick = () => showDetails(id, data, displayId);
            tableBody.appendChild(row);
        });
    });
}

// 3. Show Details (Replicates 'Ticket Details' area)
function showDetails(id, data, displayId) {
    selectedAppId = id;
    detailsSection.style.display = 'block';
    
    // Connects to the data fields from your apply.js
    detailsContent.innerHTML = `
        <p><strong>Contact:</strong> ${data.step1?.email || 'N/A'}</p>
        <p><strong>Course:</strong> ${data.step2?.choice1 || 'N/A'}</p>
        <p><strong>Application Note:</strong> Student from ${data.step1?.address?.province || 'Unknown Province'}</p>
        <p><strong>Demographics:</strong> ${data.step1?.race || ''} | ${data.step1?.gender || ''}</p>
        <p><strong>Internal ID:</strong> ${id}</p>
    `;
    
    // Load existing note if it exists
    staffNoteInput.value = data.adminNote || "";
}

// 4. Save Note Functionality (Updates Firestore)
saveNoteBtn.onclick = async () => {
    if (!selectedAppId) return;
    
    const note = staffNoteInput.value;
    try {
        const appRef = doc(db, "applications", selectedAppId);
        await updateDoc(appRef, {
            adminNote: note,
            status: "resolved" // Automatically resolves when staff takes action
        });
        alert("Note saved and status updated to Resolved!");
    } catch (error) {
        console.error("Error updating note:", error);
        alert("Failed to save note.");
    }
};

// 5. Simple Search Implementation
document.getElementById('searchInput').addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    const rows = tableBody.getElementsByTagName('tr');
    for (let row of rows) {
        row.style.display = row.innerText.toLowerCase().includes(filter) ? '' : 'none';
    }
});

