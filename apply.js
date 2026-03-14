import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const applyForm = document.getElementById('applyForm');
let currentStep = 1;

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

                if (currentStep === 1) {
            currentStep = 2;
            document.getElementById('step1Container').style.display = 'none';
            document.getElementById('step2Container').style.display = 'block';
            document.querySelector('h2').innerText = "Step 2 of 4: Course & Education";
            
            // Update Progress Bar
            const dots = document.querySelectorAll('.step-dot');
            const lines = document.querySelectorAll('.step-line');
            dots[1].classList.add('active');
            lines[1].classList.add('active');
            
            window.scrollTo(0, 0);
            return; // Stop here so it doesn't try to save Step 2 yet
        }
 
            if (currentStep === 2) {
        const step2Data = {
            schoolName: document.getElementById('schoolName').value,
            schoolLoc: document.getElementById('schoolLoc').value,
            matricYear: document.getElementById('matricYear').value,
            examBody: document.getElementById('examBody').value,
            highestGrade: document.getElementById('highestGrade').value,
            sub1: document.getElementById('sub1').value,
            res1: document.getElementById('res1').value,
            sub2: document.getElementById('sub2').value,
            res2: document.getElementById('res2').value,
            apsScore: document.getElementById('apsScore').value,
            choice1: document.getElementById('choice1').value,
            choice2: document.getElementById('choice2').value,
            acadYear: document.getElementById('acadYear').value,
            campus: document.getElementById('campus').value,
            attendance: document.getElementById('attendance').value,
            housing: document.getElementById('housing').value,
            nsfas: document.getElementById('nsfas').value,
            lastUpdated: new Date()
        };

        await setDoc(doc(db, "applications", user.uid), {
            step2: step2Data,
            progress: 50,
            currentStep: 3
        }, { merge: true });

        alert("Step 2 Saved! Proceed to Document Uploads.");
    }

    } catch (error) {
        alert("Error saving: " + error.message);
    }
});
