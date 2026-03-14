import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const applyForm = document.getElementById('applyForm');

// 1. SECURE: Kick out if not logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        // Pre-fill email and name from auth if available to save time
        document.getElementById('email').value = user.email || '';
        
        // Auto-load existing data if they previously started Step 1
        const draftDoc = await getDoc(doc(db, "applications", user.uid));
        if (draftDoc.exists()) {
            const data = draftDoc.data().step1;
            if (data) {
                for (const key in data) {
                    const el = document.getElementById(key);
                    if (el) el.value = data[key];
                }
            }
        }
    }
});

// 2. Handle Form Submission
applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) return;

    // Collect all data into an object
    const step1Data = {
        fullNames: document.getElementById('fullNames').value,
        surname: document.getElementById('surname').value,
        idNumber: document.getElementById('idNumber').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        title: document.getElementById('title').value,
        nationality: document.getElementById('nationality').value,
        homeLanguage: document.getElementById('homeLanguage').value,
        email: document.getElementById('email').value,
        mobile: document.getElementById('mobile').value,
        altPhone: document.getElementById('altPhone').value,
        address: document.getElementById('address').value,
        postalAddress: document.getElementById('postalAddress').value,
        race: document.getElementById('race').value,
        disability: document.getElementById('disability').value,
        citizenship: document.getElementById('citizenship').value,
        nokName: document.getElementById('nokName').value,
        nokRelation: document.getElementById('nokRelation').value,
        nokPhone: document.getElementById('nokPhone').value,
        marital: document.getElementById('marital').value,
        employment: document.getElementById('employment').value,
        socialGrant: document.getElementById('socialGrant').value,
        step1Complete: true,
        progress: 25, // Step 1 is 25% of 4 steps
        lastUpdated: new Date()
    };

    try {
        // Save to applications collection using user UID
        await setDoc(doc(db, "applications", user.uid), {
            studentId: user.uid,
            step1: step1Data,
            currentStep: 2
        }, { merge: true });

        alert("Step 1 saved! Moving to Step 2.");
        // window.location.href = "step2.html"; 
    } catch (error) {
        alert("Error saving: " + error.message);
    }
});
