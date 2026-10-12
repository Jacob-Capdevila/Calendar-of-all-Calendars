import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { auth, db } from './firebaseConfig'; // <-- ADDED auth HERE
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PeriodLog {
    id: string;
    startDate: string; // YYYY-MM-DD
    endDate: string | null; // YYYY-MM-DD
}

export function usePeriodTracker() {
    const [householdId, setHouseholdId] = useState<string | null>(null);
    const [logs, setLogs] = useState<PeriodLog[]>([]);

    // ⬇️ THE FINAL SAFETY NET
    useEffect(() => {
        const fetchId = async () => {
            const id = await AsyncStorage.getItem('householdId');
            
            // Ensure the ID exists AND is not a leftover ghost string
            if (id && id !== 'user.uid' && id !== 'DEFAULT_HOUSEHOLD') {
                setHouseholdId(id);
            } else {
                // Self-Heal: Pull the real ID from Firebase Auth
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const actualUid = currentUser.uid;
                    await AsyncStorage.setItem('householdId', actualUid);
                    setHouseholdId(actualUid);
                }
            }
        };
        fetchId();
    }, []);
    

    // 1. Live Firebase Listener
    useEffect(() => {
        if (!householdId) return;

        const logsRef = collection(db, 'period_logs');
        const q = query(logsRef, where('householdId', '==', householdId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PeriodLog[];
            
            // Sort chronologically (newest first)
            fetchedLogs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            setLogs(fetchedLogs);
        });

        return () => unsubscribe();
    }, [householdId]);

    // 2. Cloud CRUD
    const addLog = async (startDate: string, endDate: string | null) => {
        await addDoc(collection(db, 'period_logs'), {
            startDate,
            endDate,
            householdId
        });
    };

    const deleteLog = async (logId: string) => {
        await deleteDoc(doc(db, 'period_logs', logId));
    };

    // --- 3. THE MATH TRANSLATION (Kotlin -> TypeScript) ---

    // Helper: Difference in days between two YYYY-MM-DD strings
    const daysBetween = (d1: string, d2: string) => {
        const diffTime = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Helper: Add days to a YYYY-MM-DD string
    const addDays = (dateStr: string, days: number) => {
        const d = new Date(dateStr + 'T12:00:00'); // Force local noon to avoid UTC shift
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    const getStats = () => {
        let avgCycle = 28;
        let avgDuration = 4;
        let variance: number | null = null;
        let nextPrediction: { start: string, end: string } | null = null;

        if (logs.length >= 2) {
            // Calculate Average Cycle
            const cycleLengths = [];
            for (let i = 0; i < logs.length - 1; i++) {
                cycleLengths.push(daysBetween(logs[i+1].startDate, logs[i].startDate));
            }
            avgCycle = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);

            // Calculate Prediction Variance (Needs 3 logs minimum)
            if (logs.length >= 3) {
                const chronological = [...logs].reverse();
                const variances = [];
                for (let i = 2; i < chronological.length; i++) {
                    const currentLog = chronological[i];
                    const prevLog = chronological[i-1];
                    const histLengths = [];
                    for(let j=0; j < i-1; j++) {
                        histLengths.push(daysBetween(chronological[j].startDate, chronological[j+1].startDate));
                    }
                    const histAvg = Math.round(histLengths.reduce((a,b)=>a+b,0)/histLengths.length);
                    const predictedStart = addDays(prevLog.startDate, histAvg);
                    variances.push(daysBetween(predictedStart, currentLog.startDate));
                }
                variance = variances.reduce((a, b) => a + b, 0) / variances.length;
            }
        }

        // Calculate Average Duration
        const finishedLogs = logs.filter(l => l.endDate);
        if (finishedLogs.length > 0) {
            const durations = finishedLogs.map(l => daysBetween(l.startDate, l.endDate!));
            avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }

        // Calculate Next Prediction Range
        if (logs.length > 0) {
            const nextStart = addDays(logs[0].startDate, avgCycle);
            const nextEnd = addDays(nextStart, avgDuration);
            nextPrediction = { start: nextStart, end: nextEnd };
        }

        return { avgCycle, avgDuration, variance, nextPrediction };
    };

    return { logs, addLog, deleteLog, getStats };
}