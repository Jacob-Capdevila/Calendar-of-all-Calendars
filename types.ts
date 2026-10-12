// types.ts

export interface Task {
    id?: string; // Optional because Firebase assigns the ID when we create it
    title: string;
    dueDate: Date | null;
    repeatType: string;
    repeatDays: string;
    category: string;
    isCompleted: boolean;
    householdId: string;
}

export interface Category {
    id?: string;
    name: string;
    colorHex: number;
    householdId: string;
}

export interface SharedCalendar {
    id: string; // The join code
    name: string;
    ownerId: string;
    members: string[];
}

export interface PeriodLog {
    id?: string;
    startDate: Date;
    endDate: Date | null;
    householdId: string;
}

export interface User {
    uid: string;
    email: string;
    householdId: string;
}