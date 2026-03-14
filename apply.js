import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";
const storage = getStorage();

const mainForm = document.getElementById('mainApplyForm');
let currentStep = 1;
let syncTimer;

window.toggleOtherNationality = function(value) {
    const otherGroup = document.getElementById('otherNationalityGroup');
    const otherInput = document.getElementById('otherNationality');
    
    if (value === 'Other') {
        otherGroup.style.display = 'block';
        otherInput.required = true; // This forces the browser to wait for input
    } else {
        otherGroup.style.display = 'none';
        otherInput.required = false; 
        otherInput.value = ''; // Clear it if they switch back to SA
    }
};


// This saves data to the cloud only after 2 seconds of 'silence' (no typing)
async function syncFieldToCloud(fieldId, value) {
    const user = auth.currentUser;
    if (!user || !fieldId) return;

    try {
        await setDoc(doc(db, "applications", user.uid), {
            draft: { [fieldId]: value },
            lastUpdated: new Date()
        }, { merge: true });
        console.log("Field synced to cloud:", fieldId);
    } catch (e) {
        console.error("Sync error:", e);
    }
}

window.toggleDisability = function(value) {
    const container = document.getElementById('disabilityDetailsContainer');
    if (value === 'Yes') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        // Reset and hide extra boxes
        document.getElementById('disability1').value = '';
        document.getElementById('disability2').value = '';
        document.getElementById('disability3').value = '';
        document.getElementById('box2').style.display = 'none';
        document.getElementById('box3').style.display = 'none';
    }
};

window.checkAddButton = function() {
    const d1 = document.getElementById('disability1').value;
    const d2 = document.getElementById('disability2').value;
    
    document.getElementById('addBtn1').style.display = (d1.length > 0 && document.getElementById('box2').style.display === 'none') ? 'block' : 'none';
};

window.addDisabilityBox = function() {
    if (document.getElementById('box2').style.display === 'none') {
        document.getElementById('box2').style.display = 'block';
        document.getElementById('addBtn1').style.display = 'none';
    } else if (document.getElementById('box3').style.display === 'none') {
        document.getElementById('box3').style.display = 'block';
    }
};

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.getElementById('email').value = user.email || '';
        
        // --- LOAD SAVED DATA FROM CLOUD ---
        const docSnap = await getDoc(doc(db, "applications", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Fill inputs from the 'draft' object
            if (data.draft) {
                Object.keys(data.draft).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) input.value = data.draft[key];
                });
              // NEW: Ensure the box shows up if 'Other' was previously saved
              const savedNationality = data.draft['nationality'];
                if (savedNationality === 'Other') {
                   document.getElementById('otherNationalityGroup').style.display = 'block';
                   document.getElementById('otherNationality').required = true;
               }
            }
        }
    }
});

// Save when they stop typing for 2 seconds
mainForm.addEventListener('input', (e) => {
    // ADDED: List of IDs to IGNORE for auto-saving
    const ignoreList = ['nationality', 'otherNationality']; 
    
    if (e.target.id && e.target.type !== 'file' && !ignoreList.includes(e.target.id)) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            syncFieldToCloud(e.target.id, e.target.value);
        }, 2000); 
    }
});

// Save IMMEDIATELY when they click or tab out of a field
mainForm.addEventListener('focusout', (e) => {
    if (e.target.id && e.target.type !== 'file') {
        syncFieldToCloud(e.target.id, e.target.value);
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
            nationality: document.getElementById('nationality').value === 'Other'
                         ? document.getElementById('otherNationality').value
                         : document.getElementById('nationality').value,
            homeLanguage: document.getElementById('homeLanguage').value,
            email: document.getElementById('email').value,
            mobile: document.getElementById('mobile').value,
            altPhone: document.getElementById('altPhone').value,
            address: document.getElementById('address').value,
            postalAddress: document.getElementById('postalAddress').value,
            race: document.getElementById('race').value,
            
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
        // Collect ALL Step 2 Data from your list
        const step2Data = {
            // 1. Matric Details
            schoolName: document.getElementById('schoolName').value,
            schoolLoc: document.getElementById('schoolLoc').value,
            matricYear: document.getElementById('matricYear').value,
            examBody: document.getElementById('examBody').value,
            highestGrade: document.getElementById('highestGrade').value,
            
            // 2. Marks & APS
            sub1: document.getElementById('sub1').value,
            res1: document.getElementById('res1').value,
            aps1: document.getElementById('aps1').value,
            sub2: document.getElementById('sub2').value,
            res2: document.getElementById('res2').value,
            aps2: document.getElementById('aps2').value,
            apsScore: document.getElementById('apsScore').value,
            
            // 3. Post-School
            prevInst: document.getElementById('prevInst').value,
            prevQual: document.getElementById('prevQual').value,
            prevStatus: document.getElementById('prevStatus').value,
            prevStudentNum: document.getElementById('prevStudentNum').value,
            
            // 4. Choices
            choice1: document.getElementById('choice1').value,
            choice2: document.getElementById('choice2').value,
            acadYear: document.getElementById('acadYear').value,
            campus: document.getElementById('campus').value,
            attendance: document.getElementById('attendance').value,
            
            // 5. Additional
            nbtNum: document.getElementById('nbtNum').value,
            housing: document.getElementById('housing').value,
            nsfas: document.getElementById('nsfas').value,
            
            lastUpdated: new Date()
        };

        try {
            await setDoc(doc(db, "applications", user.uid), {
                step2: step2Data,
                progress: 50, // Updated progress
                currentStep: 3
            }, { merge: true });

            alert("Step 2 Saved! Moving to Step 3.");
            
            // Logic to move to Step 3 would go here
            currentStep = 3; 
            document.getElementById('step2Container').style.display = 'none';
            document.getElementById('step3Container').style.display = 'block';
            document.getElementById('dot3').classList.add('active');
            document.getElementById('line2').classList.add('active');

        } catch (error) {
            alert("Error: " + error.message);
        }

        } else if (currentStep === 3) {
    // 1. Manual Validation for required files
    const requiredFiles = [
        { id: 'file_id', label: 'ID / Passport' },
        { id: 'file_matric', label: 'Matric Certificate' },
        { id: 'file_address', label: 'Proof of Address' }
    ];

    for (let f of requiredFiles) {
        if (!document.getElementById(f.id).files[0]) {
            alert(`Please select your ${f.label} before continuing.`);
            return; // Stops the upload if a file is missing
        }
    }

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.innerText = "Uploading... Please wait";
    uploadBtn.disabled = true;

    const filesToUpload = [
        { id: 'file_id', name: 'ID_Passport' },
        { id: 'file_birth', name: 'Birth_Certificate' },
        { id: 'file_marriage', name: 'Marriage_Certificate' },
        { id: 'file_matric', name: 'Matric_Certificate' },
        { id: 'file_grade11', name: 'Grade_11_Results' },
        { id: 'file_transcripts', name: 'Transcripts' },
        { id: 'file_address', name: 'Proof_of_Address' },
        { id: 'file_pop', name: 'Proof_of_Payment' },
        { id: 'file_sponsor', name: 'Sponsor_ID' },
        { id: 'file_motivation', name: 'Motivation_Letter' },
        { id: 'file_cv', name: 'CV' }
    ];

    const uploadPromises = filesToUpload.map(async (f) => {
        const fileInput = document.getElementById(f.id);
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `applications/${user.uid}/${f.name}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        }
        return null;
    });

    try {
        const urls = await Promise.all(uploadPromises);
        const documentData = {};
        filesToUpload.forEach((f, index) => {
            if (urls[index]) documentData[f.name] = urls[index];
        });

        await setDoc(doc(db, "applications", user.uid), {
            documents: documentData,
            currentStep: 4,
            lastUpdated: new Date()
        }, { merge: true });

        alert("Documents uploaded successfully!");
        
        document.getElementById('step3Container').style.display = 'none';
        document.getElementById('step4Container').style.display = 'block'; 
        document.getElementById('dot4').classList.add('active');
        document.getElementById('line3').classList.add('active');
        
        if (typeof renderReviewSummary === "function") renderReviewSummary();
        
        currentStep = 4;
        window.scrollTo(0, 0);

    } catch (error) {
        alert("Upload failed: " + error.message);
        uploadBtn.innerText = "Upload & Continue";
        uploadBtn.disabled = false;
    }
}

});

