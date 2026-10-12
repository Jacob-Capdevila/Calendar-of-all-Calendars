import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // <-- NEW: Imported Alert for diagnostics

export interface Chore {
    id: string;
    title: string;
    dayOfWeek: string;
    isCompleted: boolean;
}

export function useChores() {
    const [chores, setChores] = useState<Chore[]>([]);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    
    const [dishwasherStatus, setDishwasherStatus] = useState<'clean' | 'dirty'>('dirty');

    useEffect(() => {
        const fetchId = async () => {
            const id = await AsyncStorage.getItem('householdId');
            
            if (id && id !== 'user.uid') {
                setHouseholdId(id);
            } else {
                const currentUser = auth.currentUser;
                
                if (currentUser) {
                    const actualUid = currentUser.uid; 
                    await AsyncStorage.setItem('householdId', actualUid);
                    setHouseholdId(actualUid);
                    console.log("Assigned real household ID:", actualUid);
                } else {
                    console.error("Cannot assign household ID: No user logged in.");
                }
            }
        };
        fetchId();
    }, []);

    useEffect(() => {
        if (!householdId) return;

        const choresRef = collection(db, 'chores');
        const q = query(choresRef, where('householdId', '==', householdId));

        const unsubChores = onSnapshot(q, (snapshot) => {
            const fetchedChores = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chore[];
            
            setChores(fetchedChores);
        });

        const stateRef = doc(db, 'household_state', householdId);
        const unsubState = onSnapshot(stateRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().dishwasherStatus) {
                setDishwasherStatus(docSnap.data().dishwasherStatus);
            } else {
                setDishwasherStatus('dirty'); 
            }
        });

        return () => { 
            unsubChores(); 
            unsubState(); 
        };
    }, [householdId]);

    const addChore = async (title: string, dayOfWeek: string) => {
        await addDoc(collection(db, 'chores'), {
            title,
            dayOfWeek,
            isCompleted: false,
            householdId
        });
    };

    const toggleChoreCompletion = async (chore: Chore) => {
        await updateDoc(doc(db, 'chores', chore.id), {
            isCompleted: !chore.isCompleted
        });
    };

    const deleteChore = async (choreId: string) => {
        await deleteDoc(doc(db, 'chores', choreId));
    };

    const resetWeek = async () => {
        const batch = writeBatch(db);
        
        chores.forEach(chore => {
            if (chore.isCompleted) {
                const choreRef = doc(db, 'chores', chore.id);
                batch.update(choreRef, { isCompleted: false });
            }
        });

        await batch.commit();
    };

    // THE FIX: The Diagnostic Trap
    const toggleDishwasher = async () => {
        if (!householdId) {
            Alert.alert("Error", "No Household ID found.");
            return;
        }
        
        const newStatus = dishwasherStatus === 'clean' ? 'dirty' : 'clean';
        
        try {
            // We removed the optimistic UI update. 
            // The button will now only change color if Firebase successfully saves it and pings the listener.
            await setDoc(doc(db, 'household_state', householdId), { dishwasherStatus: newStatus }, { merge: true });
        } catch (error: any) {
            // This catches the silent block and puts it right on your screen
            Alert.alert("🚨 Firebase Blocked It!", error.message);
        }
    };

    return { chores, addChore, toggleChoreCompletion, deleteChore, resetWeek, dishwasherStatus, toggleDishwasher };
}