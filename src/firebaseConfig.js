import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";

// Configuración Real de Firebase Inteligencia La Serena
const firebaseConfig = {
    apiKey: "AIzaSyBBm5-2v6RRjwoHrANNjx7kcS2YQdMTR2w",
    authDomain: "redvecinos-smart-imls.firebaseapp.com",
    projectId: "redvecinos-smart-imls",
    storageBucket: "redvecinos-smart-imls.firebasestorage.app",
    messagingSenderId: "954780252843",
    appId: "1:954780252843:web:29e778bf5c832b863bd5ee",
    measurementId: "G-YGVSXCG4QG"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Cloud Firestore and Cloud Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper functions for Fiscalización module
export const dbCollection = collection(db, "reportes_comerciales");
export { addDoc, serverTimestamp, ref, uploadString, uploadBytes, getDownloadURL };
