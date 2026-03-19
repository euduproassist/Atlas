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
        // We create a reference to the 'draft' object to ensure arrays overwrite correctly
        const dataToSave = {
            currentStep: currentStep,
            lastUpdated: new Date(),
            draft: {} 
        };
        dataToSave.draft[fieldId] = value;

        await setDoc(doc(db, "drafts", user.uid), dataToSave, { merge: true });
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

window.toggleOtherQual = function(value) {
    const otherGroup = document.getElementById('otherQualGroup');
    const otherInput = document.getElementById('otherQual');
    
    if (value === 'Other') {
        otherGroup.style.display = 'block';
        otherInput.required = true;
    } else {
        otherGroup.style.display = 'none';
        otherInput.required = false;
        otherInput.value = ''; 
    }
    // Automatically save the selection to cloud
    syncFieldToCloud('examBody', value);
};


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        document.getElementById('email').value = user.email || '';

 // --- LOAD SAVED DATA FROM CLOUD ---
const docSnap = await getDoc(doc(db, "drafts", user.uid));
if (docSnap.exists()) {
    const data = docSnap.data();
    const draft = data.draft || {};

    // Fill standard inputs
    Object.keys(draft).forEach(key => {
        const input = document.getElementById(key);
        if (input && input.type !== 'file') { 
            input.value = draft[key];
        }
    });

    // --- FIX: REBUILD SUBJECT ROWS ---
    if (draft.subjects && draft.subjects.length > 0) {
        const container = document.getElementById('subjectsContainer');
        container.innerHTML = ''; // Clear the default empty row
        subjectCount = 0; // Reset counter for clean rebuild

        draft.subjects.forEach((sub, index) => {
            window.addSubjectRow(); // This creates row1, row2, etc.
            const row = document.getElementById(`row${index + 1}`);
            if (row) {
                row.querySelector('.sub-name').value = sub.name || '';
                row.querySelector('.sub-perc').value = sub.percentage || '';
                row.querySelector('.sub-level').value = sub.level || '';
            }
        });
        // Ensure the "Add" button shows up if the last row is complete
        window.validateRows(); 
    }

    // --- FIX: REBUILD POST-SCHOOL QUALIFICATIONS ---
    if (draft.postSchoolQualifications && draft.postSchoolQualifications.length > 0) {
        const psContainer = document.getElementById('postSchoolContainer');
        psContainer.innerHTML = ''; // Clear default

        draft.postSchoolQualifications.forEach((qual) => {
            window.addPostSchoolRow();
            const rows = document.querySelectorAll('.post-school-row');
            const lastRow = rows[rows.length - 1];
            const inputs = lastRow.querySelectorAll('.ps-input');
            
            inputs[0].value = qual.institutionalName || '';
            inputs[1].value = qual.qualificationName || '';
            
            const statusSelect = lastRow.querySelector('.ps-status');
            statusSelect.value = qual.status || '';
            
            inputs[2].value = qual.studentNumber || '';
            inputs[3].value = qual.modulePercentageAverage || '';
            
            const yearInput = lastRow.querySelector('.ps-year');
            yearInput.value = qual.yearCompleted || '';
            
            // Trigger the disabled logic for 'Discontinued' status
            window.handleDiscontinued(statusSelect);
        });
        window.validatePostSchool();
    }

             // 1. Restore the correct Step/Page
           if (data.currentStep) {
            currentStep = data.currentStep;
            // Hide all steps first
            document.getElementById('step1Container').style.display = 'none';
            document.getElementById('step2Container').style.display = 'none';
            document.getElementById('step3Container').style.display = 'none';
            if(document.getElementById('step4Container')) document.getElementById('step4Container').style.display = 'none';

            
            // Show the saved step
            document.getElementById(`step${currentStep}Container`).style.display = 'block';
                           if(currentStep === 4 && typeof window.renderReviewSummary === "function") {
                window.renderReviewSummary();
            }
            
            // Update progress bar UI (dots)
            for(let i=1; i<=currentStep; i++) {
                document.getElementById(`dot${i}`).classList.add('active');
                if(i < currentStep) document.getElementById(`line${i}`).classList.add('active');
                  }
               }

                if (data.draft['examBody'] === 'Other') {
                   document.getElementById('examBody').value = 'Other';
                   document.getElementById('otherQualGroup').style.display = 'block';
                   document.getElementById('otherQual').value = data.draft['otherQual'] || '';
               }

              // NEW: Ensure the box shows up if 'Other' was previously saved
              const savedNationality = data.draft['nationality'];
                if (savedNationality === 'Other') {
                   document.getElementById('otherNationalityGroup').style.display = 'block';
                   document.getElementById('otherNationality').required = true;
               }
        // 2. NEW: Restore Disability boxes
        const savedDisability = data.draft['disability'];
        if (savedDisability === 'Yes') {
            document.getElementById('disabilityDetailsContainer').style.display = 'block';
            
            // Show box 2 if it has data
            if (data.draft['disability2']) {
                document.getElementById('box2').style.display = 'block';
            }
            // Show box 3 if it has data
            if (data.draft['disability3']) {
                document.getElementById('box3').style.display = 'block';
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
            address: {
                street: document.getElementById('physStreet').value,
                suburb: document.getElementById('physSuburb').value,
                province: document.getElementById('physProvince').value,
                postalCode: document.getElementById('physPostalCode').value,
                country: document.getElementById('physCountry').value
            },
            postalAddress: {
                street: document.getElementById('postStreet').value,
                suburb: document.getElementById('postSuburb').value,
                province: document.getElementById('postProvince').value,
                postalCode: document.getElementById('postPostalCode').value,
                country: document.getElementById('postCountry').value
            },
            race: document.getElementById('race').value,
            disability: document.getElementById('disability').value,
            disabilityDetails: document.getElementById('disability').value === 'Yes' 
            ? [
            document.getElementById('disability1').value,
            document.getElementById('disability2').value,
            document.getElementById('disability3').value
            ].filter(val => val !== "") 
            : [],
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
            await setDoc(doc(db, "drafts", user.uid), {
                step1: step1Data,
                currentStep: 2
            }, { merge: true });

            // SWITCH UI TO STEP 2
            goToStep(2);


        } catch (error) {
            alert("Error: " + error.message);
        }

            } else if (currentStep === 2) {
        // Collect ALL Step 2 Data from your list
        // Collect dynamic subject rows
            const subjectsList = [];
            document.querySelectorAll('#subjectsContainer .form-grid').forEach(row => {
                  subjectsList.push({
            name: row.querySelector('.sub-name').value,
            percentage: row.querySelector('.sub-perc').value,
            level: row.querySelector('.sub-level').value
               });
            });

      // --- THE NEW POST-SCHOOL LOGIC HERE ---
        const postSchoolRows = document.querySelectorAll('.post-school-row');
        const val = validatePostSchool();

        // If any part of the section has data, ensure the last row is fully valid
        if (val.anyFilled && !val.allFilled) {
            alert("Please ensure all 6 fields are filled in your last qualification entry, or clear them to proceed.");
            return;
        }

        const qualData = [];
        if (val.allFilled) {
            postSchoolRows.forEach(row => {
                const inputs = row.querySelectorAll('.ps-input');
                const status = row.querySelector('.ps-status').value;
                const year = row.querySelector('.ps-year').value;
                qualData.push({
                    institutionalName: inputs[0].value,
                    qualificationName: inputs[1].value,
                    status: status,
                    studentNumber: inputs[2].value,
                    modulePercentageAverage: inputs[3].value,
                    yearCompleted: year
                });
            });
        }
        const step2Data = {
            // 1. Matric Details
            schoolName: document.getElementById('schoolName').value,
            schoolCountry: document.getElementById('schoolCountry').value,
            schoolProvince: document.getElementById('schoolProvince').value,
            matricYear: document.getElementById('matricYear').value,
            examBody: document.getElementById('examBody').value === 'Other'
                ? document.getElementById('otherQual').value
                : document.getElementById('examBody').value,
                           
            currentStatus: document.getElementById('currentStatus').value,
            
            // 2. Marks & APS
            subjects: subjectsList,
            APS: document.getElementById('APS').value,

           // 3. NEW DYNAMIC POST-SCHOOL FIELD
            postSchoolQualifications: qualData,
            
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
            await setDoc(doc(db, "drafts", user.uid), {
                step2: step2Data,
                progress: 50, // Updated progress
                currentStep: 3
            }, { merge: true });
            
            // Logic to move to Step 3 would go here
            goToStep(3);


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

        await setDoc(doc(db, "drafts", user.uid), {
            documents: documentData,
            lastUpdated: new Date()
        }, { merge: true });

        // At the very end of your final step logic:
        const draftSnap = await getDoc(doc(db, "drafts", user.uid));

        if (draftSnap.exists()) {
        await setDoc(doc(db, "applications", user.uid), {
        ...draftSnap.data(),
        status: "pending",
        submittedAt: new Date()
        },
        { merge: true});  
    
      alert("Application Submitted Successfully!");
       }

       // PASTE THIS INSTEAD:
        goToStep(4);
        if (typeof renderReviewSummary === "function") renderReviewSummary();

    } catch (error) {
        alert("Upload failed: " + error.message);
        uploadBtn.innerText = "Upload & Continue";
        uploadBtn.disabled = false;
    }
}

});

function populateMatricYears() {
    const select = document.getElementById('matricYear');
    const currentYear = new Date().getFullYear();
    
    // Start 50 years ago, end 10 years into the future
    for (let year = currentYear - 50; year <= currentYear + 10; year++) {
        let option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    }
}

// Call this function when the script loads
populateMatricYears();

let subjectCount = 0;

window.addSubjectRow = function() {
    subjectCount++;
    const container = document.getElementById('subjectsContainer');
    const row = document.createElement('div');
    row.className = 'form-grid';
    row.style.marginBottom = '10px';
    row.id = `row${subjectCount}`;
    row.innerHTML = `
        <div class="input-group"><input type="text" placeholder="Subject Name" class="sub-name" oninput="validateRows()"></div>
        <div class="input-group"><input type="number" placeholder="Percentage" class="sub-perc" oninput="validateRows()"></div>
        <div class="input-group"><input type="number" placeholder="Level" class="sub-level" oninput="validateRows()"></div>
    `;
    container.appendChild(row);
    document.getElementById('addSubjectRowBtn').style.display = 'none';
}

window.validateRows = function() {
    const rows = document.querySelectorAll('#subjectsContainer .form-grid');
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('input');
    
    // Check if the "Add" button should show
    const allFilled = Array.from(inputs).every(input => input.value.trim() !== "");
    document.getElementById('addSubjectRowBtn').style.display = allFilled ? 'block' : 'none';

    // --- CRITICAL: MOVE THIS INSIDE THE BRACKETS ---
    const subjectsList = [];
    rows.forEach(row => {
        subjectsList.push({
            name: row.querySelector('.sub-name').value,
            percentage: row.querySelector('.sub-perc').value,
            level: row.querySelector('.sub-level').value
        });
    });
     // Explicitly pass the full array to ensure the cloud matches the UI exactly
    if (subjectsList.length > 0) {
        syncFieldToCloud('subjects', subjectsList); 
    }

};


// Add this new logic to handle Discontinued status
window.handleDiscontinued = function(selectElement) {
    const row = selectElement.closest('.post-school-row');
    const yearInput = row.querySelector('.ps-year');
    if (selectElement.value === 'Discontinued') {
        yearInput.disabled = true;
        yearInput.value = '';
    } else {
        yearInput.disabled = false;
    }
};

window.addPostSchoolRow = function() {
    const container = document.getElementById('postSchoolContainer');
    const row = document.createElement('div');
    row.className = 'form-grid post-school-row';
    row.style.cssText = "margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;";
    row.innerHTML = `
        <div class="input-group"><label>Institutional name</label><input type="text" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Qualification name</label><input type="text" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Status</label><select class="ps-status" onchange="validatePostSchool(); handleDiscontinued(this)"><option value="">Select</option><option value="Completed">Completed</option><option value="Registered">Currently Registered</option><option value="Discontinued">Discontinued</option></select></div>
        <div class="input-group"><label>Student Number</label><input type="text" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Module percentage average</label><input type="number" class="ps-input" oninput="validatePostSchool()"></div>
        <div class="input-group"><label>Year Completed/to be completed</label><input type="number" class="ps-year" oninput="validatePostSchool()"></div>
    `;
    container.appendChild(row);
    document.getElementById('addPostSchoolBtn').style.display = 'none';
};

window.validatePostSchool = function() {
    const rows = document.querySelectorAll('.post-school-row');
    const lastRow = rows[rows.length - 1];
    const inputs = lastRow.querySelectorAll('.ps-input');
    const status = lastRow.querySelector('.ps-status');
    const year = lastRow.querySelector('.ps-year');
    
    let allFilled = true;
    let anyFilled = false;
    
    inputs.forEach(i => { if(i.value.trim() !== "") anyFilled = true; else allFilled = false; });
    if(status.value === "") allFilled = false; else anyFilled = true;
    if(status.value !== 'Discontinued' && year.value.trim() === "") allFilled = false;
    
    document.getElementById('addPostSchoolBtn').style.display = (allFilled) ? 'block' : 'none';

    // --- CRITICAL: MOVE THIS INSIDE THE BRACKETS ---
    const qualData = [];
    rows.forEach(row => {
        const rowInputs = row.querySelectorAll('.ps-input');
        qualData.push({
            institutionalName: rowInputs[0].value,
            qualificationName: rowInputs[1].value,
            status: row.querySelector('.ps-status').value,
            studentNumber: rowInputs[2].value,
            modulePercentageAverage: rowInputs[3].value,
            yearCompleted: row.querySelector('.ps-year').value
        });
    });
   // Explicitly pass the full array
    if (qualData.length > 0) {
        syncFieldToCloud('postSchoolQualifications', qualData);
    }

    return { allFilled, anyFilled };
};

// Add this at the very end of apply.js
window.goToStep = async function(stepNumber) {
    const user = auth.currentUser;
    
    // Hide current step
    document.getElementById(`step${currentStep}Container`).style.display = 'none';
    
    // Show new step
    document.getElementById(`step${stepNumber}Container`).style.display = 'block';
    
    // Update the step counter
    currentStep = stepNumber;

    // Save the step progress to Firebase immediately (R0 cost - tiny string)
    if (user) {
        await setDoc(doc(db, "drafts", user.uid), { currentStep: currentStep }, { merge: true });
    }
    window.scrollTo(0, 0);
};

window.renderReviewSummary = async function() {
    const user = auth.currentUser;
    const docSnap = await getDoc(doc(db, "drafts", user.uid));
    const summaryDiv = document.getElementById('reviewSummary');
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        const s1 = data.step1 || {};
        const s2 = data.step2 || {};

        summaryDiv.innerHTML = `
            <h3 style="color:var(--primary); border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">Application Summary</h3>
            <p><strong>Full Name:</strong> ${s1.fullNames} ${s1.surname}</p>
            <p><strong>Identity Number:</strong> ${s1.idNumber}</p>
            <p><strong>Email:</strong> ${s1.email}</p>
            <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
            <p><strong>1st Choice:</strong> ${s2.choice1}</p>
            <p><strong>Academic Year:</strong> ${s2.acadYear}</p>
            <p><strong>Total APS:</strong> ${s2.APS}</p>
            <p style="margin-top:15px; color:#27ae60; font-weight:600;"><i class="fas fa-check-circle"></i> Documents have been uploaded to the vault.</p>
        `;
    }
};

// --- THE STARTUP CHECK ---
setTimeout(() => {
    const container = document.getElementById('subjectsContainer');
    if (container && container.children.length === 0) {
        window.addSubjectRow();
    }
}, 1000);


