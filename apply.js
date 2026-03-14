import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const mainForm = document.getElementById('mainApplyForm');
let currentStep = 1;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.getElementById('email').value = user.email || '';
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
            lastUpdated: new Date()
        };

        try {
            await setDoc(doc(db, "applications", user.uid), {
                step1: step1Data,
                currentStep: 2
            }, { merge: true });

            // SWITCH UI TO STEP 2
            document.getElementById('step1Container').style.display = 'none';
            document.getElementById('step2Container').style.display = 'block';
            
            // Update Progress Bar
            document.getElementById('dot2').classList.add('active');
            document.getElementById('line1').classList.add('active');
            
            currentStep = 2;
            window.scrollTo(0, 0);
        } catch (error) {
            alert("Error: " + error.message);
        }

    } else if (currentStep === 2) {
        // Collect Step 2 Data (School, Marks, Choices)
        const step2Data = {
            schoolName: document.getElementById('schoolName').value,
            schoolLoc: document.getElementById('schoolLoc').value,
            matricYear: document.getElementById('matricYear').value,
            examBody: document.getElementById('examBody').value,
            highestGrade: document.getElementById('highestGrade').value,
            sub1: document.getElementById('sub1').value,
            res1: document.getElementById('res1').value,
            apsScore: document.getElementById('apsScore').value,
            choice1: document.getElementById('choice1').value,
            acadYear: document.getElementById('acadYear').value,
            attendance: document.getElementById('attendance').value,
            lastUpdated: new Date()
        };

        try {
            await setDoc(doc(db, "applications", user.uid), {
                step2: step2Data,
                currentStep: 3
            }, { merge: true });

            alert("Step 2 Saved! Application is progressing.");
            // You can now redirect or show Step 3
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
});

