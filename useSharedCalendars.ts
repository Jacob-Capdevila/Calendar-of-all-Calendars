import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export interface SharedCalendar {
    id: string;
    name: string;
    ownerId: string;
    members: string[];
}

export function useSharedCalendars() {
    const [calendars, setCalendars] = useState<SharedCalendar[]>([]);

    // 1. Live Listener for any group you belong to
    useEffect(() => {
        if (!auth.currentUser) return;

        const calRef = collection(db, 'shared_calendars');
        // Firebase specific query to check if your UID is inside the members array
        const q = query(calRef, where('members', 'array-contains', auth.currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SharedCalendar[];
            
            setCalendars(fetched);
        });

        return () => unsubscribe();
    }, [auth.currentUser]);

    // 2. Create a new isolated workspace
    const createCalendar = async (name: string) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        // Matches your security rule: ownerId == uid && uid in members
        await addDoc(collection(db, 'shared_calendars'), {
            name,
            ownerId: uid,
            members: [uid],
            createdAt: Date.now()
        });
    };

    // 3. Join an existing workspace using its ID
    const joinCalendar = async (calendarId: string): Promise<boolean> => {
        if (!auth.currentUser) return false;
        const uid = auth.currentUser.uid;

        try {
            const calRef = doc(db, 'shared_calendars', calendarId.trim());
            const calSnap = await getDoc(calRef);

            if (calSnap.exists()) {
                // Add yourself to the members array
                await updateDoc(calRef, {
                    members: arrayUnion(uid)
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Join error:", error);
            return false;
        }
    };

    // 4. Delete the workspace (Only works if you are the owner!)
    const deleteCalendar = async (calendarId: string) => {
        await deleteDoc(doc(db, 'shared_calendars', calendarId));
    };

    // 5. Leave a workspace (Remove self from members)
    const leaveCalendar = async (calendarId: string, members: string[]) => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        
        const updatedMembers = members.filter(id => id !== uid);
        await updateDoc(doc(db, 'shared_calendars', calendarId), {
            members: updatedMembers
        });
    };

    return { calendars, createCalendar, joinCalendar, deleteCalendar, leaveCalendar };
}