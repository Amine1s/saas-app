import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyAUvmnb9IZrNGlYso5BvpIhLrz7r60oj1I",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "saas-mini-3d8b0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saas-mini-3d8b0",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "saas-mini-3d8b0.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "480278163071",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:480278163071:web:727f2bb909305b58f6194a",
};

let db: Firestore | null = null;

try {
  if (firebaseConfig.projectId) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  }
} catch (error) {
  console.warn('[Firebase Client] Firebase client initialization skipped or failed:', error);
}

export { db, firebaseConfig };
