import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBYQY2-wLmm4XB1AmRO_t7ACvJiXNrjEM",
  authDomain: "atlas-c58f8.firebaseapp.com",
  projectId: "atlas-c58f8",
  storageBucket: "atlas-c58f8.firebasestorage.app",
  messagingSenderId: "645586610569",
  appId: "1:645586610569:web:f9182dea6a718615a75958",
  measurementId: "G-R08BR0Z8RS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services to be exported
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
