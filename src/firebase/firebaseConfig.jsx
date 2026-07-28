import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAPjkDsrHaafatVPJbG2ebk9Cbp219VOnE",
  authDomain: "docs-app-270e7.firebaseapp.com",
  projectId: "docs-app-270e7",
  storageBucket: "docs-app-270e7.appspot.com",
  messagingSenderId: "1075659271026",
  appId: "1:1075659271026:web:009db771d4bc424dfe8beb",
  measurementId: "G-KGHVX3SDRL",
};

export const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);
export const storage = getStorage(app);
