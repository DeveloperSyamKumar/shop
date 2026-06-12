import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bujji-akka-store.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bujji-akka-store",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bujji-akka-store.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:12345:web:12345"
};

let app = null;
let db = null;
let isMock = true;

if (firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    isMock = false;
    console.log("Firebase initialized in Cloud Mode.");
  } catch (error) {
    console.warn("Failed to initialize Firebase. Falling back to Local Mode.", error);
    db = null;
    isMock = true;
  }
} else {
  console.log("No Firebase API Key found. Running in Local Storage Fallback Mode.");
}

export { db, isMock };
export default db;