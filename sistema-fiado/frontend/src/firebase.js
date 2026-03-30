import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBloWH-Tf183YRw945ho8Jcc_EqsfD38tM",
  authDomain: "sistema-fiado.firebaseapp.com",
  projectId: "sistema-fiado",
  storageBucket: "sistema-fiado.firebasestorage.app",
  messagingSenderId: "28950483459",
  appId: "1:28950483459:web:8382ad04e6b9ebe076f436"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);