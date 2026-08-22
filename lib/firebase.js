"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Public Firebase web config (safe to ship to the client by design).
const firebaseConfig = {
  apiKey: "AIzaSyBhd8GRdayWn1mn74CD9PhFJ3yoZVX2Mow",
  authDomain: "hydstartups-88207.firebaseapp.com",
  projectId: "hydstartups-88207",
  storageBucket: "hydstartups-88207.firebasestorage.app",
  messagingSenderId: "31782777569",
  appId: "1:31782777569:web:6f446687ff34976904fda0",
  measurementId: "G-WSV3VC8ESR",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
