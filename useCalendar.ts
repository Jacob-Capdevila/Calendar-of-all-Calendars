import { useState, useEffect, useMemo } from 'react';
import { Platform } from 'react-native'; 
import { auth, db } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, addDoc, setDoc } from 'firebase/firestore';
import { scheduleEventReminders } from './notificationManager';

export interface Task {
    id: string; title: string; dueDate: string | null; endTime?: string | null; repeatType: string;
    repeatDays: string; category: string; isCompleted: boolean;
    googleEventId?: string; isExternal?: boolean; 
}

export interface Category { id: string; name: string; colorHex: number; }

let GoogleSignin: any;
if (Platform.OS !== 'web') {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
}

export function useCalendar() {
    const [firebaseTasks, setFirebaseTasks] = useState<Task[]>([]);
    const [googleTasks, setGoogleTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [householdId, setHouseholdId] = useState<string | null>(null);
    
    const [showExternalEvents, setShowExternalEvents] = useState(true);
    const toggleExternalEvents = () => setShowExternalEvents(!showExternalEvents);

    useEffect(() => {
        const fetchId = async () => {
            const id = await AsyncStorage.getItem('householdId');
            const token = await AsyncStorage.getItem('google_calendar_token');

            if (auth.currentUser && !token) {
                console.log("⚠️ Ghost State Detected. Forcing logout to retrieve new Google Token.");
                await auth.signOut();
                return;
            }

            if (id && id !== 'user.uid' && id !== 'DEFAULT_HOUSEHOLD') {
                setHouseholdId(id);
            } else if (auth.currentUser) {
                await AsyncStorage.setItem('householdId', auth.currentUser.uid);
                setHouseholdId(auth.currentUser.uid);
            }
        };
        fetchId();
    }, []);

    useEffect(() => {
        if (!householdId) return;
        const tasksRef = collection(db, 'household_tasks');
        const unsubTasks = onSnapshot(query(tasksRef, where('householdId', '==', householdId)), (snapshot) => {
            setFirebaseTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[]);
        });
        const catRef = collection(db, 'categories');
        const unsubCat = onSnapshot(query(catRef, where('householdId', '==', householdId)), (snapshot) => {
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);
        });
        return () => { unsubTasks(); unsubCat(); };
    }, [householdId]);

    useEffect(() => {
        const fetchAllGoogleCalendars = async () => {
            try {
                const cachedEvents = await AsyncStorage.getItem('cached_google_events');
                if (cachedEvents) {
                    setGoogleTasks(JSON.parse(cachedEvents));
                }
            } catch (error) {
                console.error("Failed to load cached Google Events:", error);
            }

            let token = await AsyncStorage.getItem('google_calendar_token');

            if (Platform.OS !== 'web' && GoogleSignin) {
                try {
                    const tokens = await GoogleSignin.getTokens();
                    if (tokens && tokens.accessToken) {
                        token = tokens.accessToken;
                        await AsyncStorage.setItem('google_calendar_token', token as string);
                    }
                } catch (error) {
                    console.log("Silent token refresh failed, user may need to re-login:", error);
                }
            }

            if (!token) return;

            try {
                const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers: { 'Authorization': `Bearer ${token}` } });
                const listData = await listRes.json();
                if (!listData.items) return;

                const timeMin = new Date(); timeMin.setMonth(timeMin.getMonth() - 1);
                const timeMax = new Date(); timeMax.setMonth(timeMax.getMonth() + 6);
                let allExternalTasks: Task[] = [];

                for (const cal of listData.items) {
                    const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const eventsData = await eventsRes.json();

                    if (eventsData.items) {
                        eventsData.items.forEach((event: any) => {
                            if (!event.start || (!event.start.dateTime && !event.start.date)) return;
                            const rawDate = event.start.dateTime || (event.start.date + 'T12:00:00');
                            const dateObj = new Date(rawDate);
                            const pad = (n: number) => n < 10 ? '0' + n : n;
                            const formattedDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
                            
                            // Capture the end time from Google if it exists
                            const rawEndDate = event.end?.dateTime;
                            let formattedEndDate = null;
                            if (rawEndDate) {
                                const endDateObj = new Date(rawEndDate);
                                formattedEndDate = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}T${pad(endDateObj.getHours())}:${pad(endDateObj.getMinutes())}:${pad(endDateObj.getSeconds())}`;
                            }

                            allExternalTasks.push({
                                id: event.id, title: event.summary || 'Busy', dueDate: formattedDate, endTime: formattedEndDate,
                                repeatType: 'NONE', repeatDays: '', category: 'Group',
                                isCompleted: false, googleEventId: event.id, isExternal: true
                            });
                        });
                    }
                }
                
                setGoogleTasks(allExternalTasks);
                await AsyncStorage.setItem('cached_google_events', JSON.stringify(allExternalTasks));
                
            } catch (error) { 
                console.error("Failed to fetch external Google Calendars:", error); 
            }
        };

        fetchAllGoogleCalendars();
        const interval = setInterval(fetchAllGoogleCalendars, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const mergedTasks = useMemo(() => {
        const firebaseGoogleIds = new Set(firebaseTasks.map(t => t.googleEventId).filter(Boolean));
        let filteredGoogleTasks: Task[] = [];
        
        if (showExternalEvents) {
            filteredGoogleTasks = googleTasks.filter(t => !firebaseGoogleIds.has(t.googleEventId));
        }
        
        return [...firebaseTasks, ...filteredGoogleTasks];
    }, [firebaseTasks, googleTasks, showExternalEvents]);

    // THE FIX: Added optional endTime to the sync function
    const syncGoogleCalendar = async (method: 'POST' | 'PATCH' | 'DELETE', title: string, dueDate: string, googleEventId?: string, endTime?: string | null) => {
        try {
            let token = await AsyncStorage.getItem('google_calendar_token');
            
            if (Platform.OS !== 'web' && GoogleSignin) {
                try {
                    const tokens = await GoogleSignin.getTokens();
                    if (tokens && tokens.accessToken) {
                        token = tokens.accessToken;
                        await AsyncStorage.setItem('google_calendar_token', token as string);
                    }
                } catch (error) {
                    console.log("Silent token refresh failed during sync:", error);
                }
            }

            if (!token) return null;

            let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
            if ((method === 'PATCH' || method === 'DELETE') && googleEventId) url += `/${googleEventId}`;
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            if (method === 'DELETE') { await fetch(url, { method: 'DELETE', headers }); return true; }
            
            const startDate = new Date(dueDate);
            const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 60 * 60 * 1000); 

            const body = JSON.stringify({ summary: title, start: { dateTime: startDate.toISOString() }, end: { dateTime: endDate.toISOString() } });
            const response = await fetch(url, { method, headers, body });
            return (await response.json()).id; 
        } catch (error) { return null; }
    };

    const getNextCustomDay = (currentDate: Date, repeatDays: string): Date => {
        const daysArray = repeatDays.split(',').filter(Boolean).map(Number);
        if (daysArray.length === 0) { const next = new Date(currentDate); next.setDate(next.getDate() + 1); return next; }
        let next = new Date(currentDate);
        for (let i = 0; i < 14; i++) { next.setDate(next.getDate() + 1); if (daysArray.includes(next.getDay())) return next; }
        return next;
    };

    // THE FIX: Calculate duration dynamically so recurring events end at the correct time of day
    const generateRecurringInstances = (title: string, startIso: string, repeatType: string, repeatDays: string, duration: string, category: string, durationMs: number) => {
        const instances = []; let current = new Date(startIso); let endDateLimit = new Date(startIso);
        if (duration === '1 Week') endDateLimit.setDate(endDateLimit.getDate() + 7);
        else if (duration === '1 Month') endDateLimit.setMonth(endDateLimit.getMonth() + 1);
        else if (duration === '3 Months') endDateLimit.setMonth(endDateLimit.getMonth() + 3);
        else endDateLimit.setMonth(endDateLimit.getMonth() + 1);
        
        while (current < endDateLimit) {
            if (repeatType === 'DAILY') current.setDate(current.getDate() + 1);
            else if (repeatType === 'WEEKLY') current.setDate(current.getDate() + 7);
            else if (repeatType === 'BIWEEKLY') current.setDate(current.getDate() + 14);
            else if (repeatType === 'MONTHLY') current.setMonth(current.getMonth() + 1);
            else if (repeatType === 'CUSTOM') current = getNextCustomDay(current, repeatDays);
            else break;
            
            if (current < endDateLimit) {
                const newStartIso = current.toISOString().replace('.000Z', ':00');
                const newEndIso = new Date(current.getTime() + durationMs).toISOString().replace('.000Z', ':00');
                instances.push({ title, dueDate: newStartIso, endTime: newEndIso, repeatType, repeatDays, category, isCompleted: false, householdId });
            }
        }
        return instances;
    };

    // THE FIX: Added endTime parameter
    const addTask = async (title: string, dueDate: string, category: string, repeatType = 'NONE', repeatDays = '', populateDuration = '1 Month', endTime: string | null = null) => {
        if (!householdId) return;
        const batch = writeBatch(db);
        const primaryGoogleId = await syncGoogleCalendar('POST', title, dueDate, undefined, endTime);
        const primaryDocRef = doc(collection(db, 'household_tasks'));
        
        batch.set(primaryDocRef, { title, dueDate, endTime, repeatType, repeatDays, category, isCompleted: false, householdId, googleEventId: primaryGoogleId || null });
        
        if (repeatType !== 'NONE') {
            const startMs = new Date(dueDate).getTime();
            const endMs = endTime ? new Date(endTime).getTime() : startMs + (60 * 60 * 1000);
            const durationMs = endMs - startMs;

            const futureTasks = generateRecurringInstances(title, dueDate, repeatType, repeatDays, populateDuration, category, durationMs);
            await Promise.all(futureTasks.map(async (task) => {
                const newDocRef = doc(collection(db, 'household_tasks'));
                const instGId = await syncGoogleCalendar('POST', task.title, task.dueDate, undefined, task.endTime);
                batch.set(newDocRef, { ...task, googleEventId: instGId || null });
            }));
        }
        await batch.commit();
        await scheduleEventReminders(primaryDocRef.id, title, new Date(dueDate));
    };

    // THE FIX: Added endTime parameter
    const editTask = async (taskId: string, title: string, dueDate: string, category: string, repeatType = 'NONE', repeatDays = '', endTime: string | null = null) => {
        const existingTask = mergedTasks.find(t => t.id === taskId);
        if (existingTask?.isExternal) return; 
        if (existingTask?.googleEventId) await syncGoogleCalendar('PATCH', title, dueDate, existingTask.googleEventId, endTime);
        await updateDoc(doc(db, 'household_tasks', taskId), { title, dueDate, endTime, category, repeatType, repeatDays });
    };

    const toggleTaskCompletion = async (task: Task) => {
        if (task.isExternal) {
            const shadowRef = doc(db, 'household_tasks', task.id);
            await setDoc(shadowRef, {
                title: task.title, dueDate: task.dueDate, endTime: task.endTime || null, repeatType: task.repeatType, 
                repeatDays: task.repeatDays, category: task.category, 
                isCompleted: true, householdId, googleEventId: task.id, 
                isExternal: false 
            });
            return;
        }
        await updateDoc(doc(db, 'household_tasks', task.id), { isCompleted: !task.isCompleted });
    };

    const deleteTask = async (taskId: string) => {
        const existingTask = mergedTasks.find(t => t.id === taskId);
        if (existingTask?.isExternal) return; 
        if (existingTask?.googleEventId) await syncGoogleCalendar('DELETE', '', '', existingTask.googleEventId);
        await deleteDoc(doc(db, 'household_tasks', taskId));
    };

    const addCategory = async (name: string, colorHexStr: string) => {
        const colorNumber = parseInt('FF' + colorHexStr.replace('#', ''), 16);
        await addDoc(collection(db, 'categories'), { name, colorHex: colorNumber, householdId });
    };

    const deleteCategory = async (categoryId: string) => await deleteDoc(doc(db, 'categories', categoryId));

    return { tasks: mergedTasks, categories, addTask, editTask, toggleTaskCompletion, deleteTask, addCategory, deleteCategory, showExternalEvents, toggleExternalEvents };
}