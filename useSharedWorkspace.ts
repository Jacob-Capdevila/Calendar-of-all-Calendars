import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface SharedTask {
    id: string;
    title: string;
    dueDate: string | null;
    category: string;
    isCompleted: boolean;
}

export function useSharedWorkspace(calendarId: string | null) {
    const [tasks, setTasks] = useState<SharedTask[]>([]);

    useEffect(() => {
        if (!calendarId) return;

        // Point directly to the specific calendar's sub-collection
        const tasksRef = collection(db, `shared_calendars/${calendarId}/tasks`);
        
        const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SharedTask[];
            setTasks(fetched);
        });

        return () => unsubscribe();
    }, [calendarId]);

    const addTask = async (title: string, dueDate: string, category: string) => {
        if (!calendarId) return;
        await addDoc(collection(db, `shared_calendars/${calendarId}/tasks`), {
            title,
            dueDate,
            category,
            isCompleted: false,
            createdAt: Date.now()
        });
    };

    const toggleTask = async (task: SharedTask) => {
        if (!calendarId) return;
        await updateDoc(doc(db, `shared_calendars/${calendarId}/tasks`, task.id), {
            isCompleted: !task.isCompleted
        });
    };

    const deleteTask = async (taskId: string) => {
        if (!calendarId) return;
        await deleteDoc(doc(db, `shared_calendars/${calendarId}/tasks`, taskId));
    };

    const editTask = async (taskId: string, title: string, dueDate: string, category: string) => {
        if (!calendarId) return;
        await updateDoc(doc(db, `shared_calendars/${calendarId}/tasks`, taskId), {
            title, dueDate, category
        });
    };

    return { tasks, addTask, toggleTask, deleteTask, editTask };
}