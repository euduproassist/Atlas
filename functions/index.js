const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendDocumentRejectionEmail = functions.firestore
    .document('applications/{userId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        // Only trigger if emailTrigger field was just added/updated
        if (!newData.emailTrigger || JSON.stringify(newData.emailTrigger) === JSON.stringify(oldData.emailTrigger)) return null;

        const { recipientEmail, studentName, reasons } = newData.emailTrigger;

        const emailContent = reasons.map(r => {
            const [docName, fault] = r.split(': ');
            let explanation = "";
            if (fault === "Blurry or Unreadable") explanation = "The photo or scan is too fuzzy to read. We need a clear, sharp image.";
            if (fault === "Expired Document") explanation = "The document has expired. Please upload a current version.";
            if (fault === "Document is Older Than 3 Months") explanation = "The date on the page must be from within the last three months.";
            if (fault === "Incorrect File Format") explanation = "Please save your document as a PDF, JPEG, or PNG.";
            if (fault === "Invalid Document") explanation = "The document provided is not the one we asked for.";
            if (fault === "Missing Documents") explanation = "Either a page is missing, or you forgot to attach it.";
            
            return `<b>${docName}</b>: ${explanation}`;
        }).join('<br><br>');

        return admin.firestore().collection('mail').add({
            to: recipientEmail,
            message: {
                subject: 'Action Required: Document Rejection - Student Portal',
                html: `Hello ${studentName},<br><br>The following documents were rejected. Please log in to your portal and re-upload them:<br><br>${emailContent}<br><br>Go to the <b>Document Vault</b> to fix these issues.`,
            }
        });
    });

