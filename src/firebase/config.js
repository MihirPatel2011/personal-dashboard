import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Uses the Mortgage CRM Firebase project — all dashboard data lives here.
// Goals / personal tasks are stored under separate paths (/goals, /goalLog, /personalTasks)
// Mortgage data (clients, loans, notes, tasks) is shared with the CRM app.
const firebaseConfig = {
  apiKey: "AIzaSyCaINWtnaBs2W55DBtiumONwdKPL5gv0yw",
  authDomain: "mortgagecrm-a8ded.firebaseapp.com",
  databaseURL: "https://mortgagecrm-a8ded-default-rtdb.firebaseio.com",
  projectId: "mortgagecrm-a8ded",
  storageBucket: "mortgagecrm-a8ded.firebasestorage.app",
  messagingSenderId: "9559437822",
  appId: "1:9559437822:web:48b7b80fa723d1a00710af",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
