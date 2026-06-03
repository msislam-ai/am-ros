import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBykX8A_F8L0JuM4oPHG1gWUWxv-9uHGfo",
  authDomain: "mango-marketplace-bangladesh.firebaseapp.com",
  databaseURL: "https://mango-marketplace-bangladesh-default-rtdb.firebaseio.com",
  projectId: "mango-marketplace-bangladesh",
  storageBucket: "mango-marketplace-bangladesh.firebasestorage.app",
  messagingSenderId: "406360686534",
  appId: "1:406360686534:web:94dbb88ad96bda7fb97cc7",
  measurementId: "G-DZSTL7W7PE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);