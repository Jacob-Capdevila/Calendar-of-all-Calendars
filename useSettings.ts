import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebaseConfig';

export function useSettings() {
    const [householdId, setHouseholdId] = useState<string | null>(null);

    // 1. Load saved Household ID on boot (WITH SAFETY NET)
    useEffect(() => {
        const loadSettings = async () => {
            const savedHousehold = await AsyncStorage.getItem('householdId');
            
            // Ensure the saved ID exists AND is not one of our old broken strings
            if (savedHousehold && savedHousehold !== 'user.uid' && savedHousehold !== 'DEFAULT_HOUSEHOLD') {
                setHouseholdId(savedHousehold);
            } else {
                // Self-Heal: If broken or missing, default back to their private UID
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await AsyncStorage.setItem('householdId', currentUser.uid);
                    setHouseholdId(currentUser.uid);
                }
            }
        };
        loadSettings();
    }, []);

    // 2. Generate Invite (Writes to Invites AND Users collections)
    const generateInviteCode = async (): Promise<string> => {
        if (!auth.currentUser) throw new Error("Not logged in");
        
        const uid = auth.currentUser.uid;
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save the code to invites
        await setDoc(doc(db, 'invites', code), { hostUid: uid, createdAt: Date.now() });
        
        // Tell the Cloud Security Rules what household this user belongs to
        await setDoc(doc(db, 'users', uid), { householdId: uid }, { merge: true });

        // Save locally for the app engine
        await AsyncStorage.setItem('householdId', uid);
        setHouseholdId(uid);
        
        return code;
    };

    // 3. Join Household (Writes to Users collection)
    const joinHousehold = async (code: string): Promise<boolean> => {
        if (!auth.currentUser) return false;

        const inviteRef = doc(db, 'invites', code.trim());
        const inviteSnap = await getDoc(inviteRef);

        if (inviteSnap.exists()) {
            const hostUid = inviteSnap.data().hostUid;
            
            // Tell the Cloud Security Rules what household this user belongs to
            await setDoc(doc(db, 'users', auth.currentUser.uid), { householdId: hostUid }, { merge: true });

            // Save locally for the app engine
            await AsyncStorage.setItem('householdId', hostUid);
            setHouseholdId(hostUid);
            return true;
        }
        return false;
    };

    // 4. Disconnect Local Device
    const disconnectHousehold = async () => {
        await AsyncStorage.removeItem('householdId');
        
        // When disconnecting, bounce them back to their personal private household
        if (auth.currentUser) {
            setHouseholdId(auth.currentUser.uid);
            await AsyncStorage.setItem('householdId', auth.currentUser.uid);
            await setDoc(doc(db, 'users', auth.currentUser.uid), { householdId: auth.currentUser.uid }, { merge: true });
        } else {
            setHouseholdId(null);
        }
    };

    // 5. Logout entirely
    const logoutUser = async () => {
        await AsyncStorage.clear();
        await signOut(auth);
    };

    return { householdId, generateInviteCode, joinHousehold, disconnectHousehold, logoutUser };
}