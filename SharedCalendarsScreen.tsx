import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as Clipboard from 'expo-clipboard';
import { useSharedCalendars, SharedCalendar } from './useSharedCalendars';
import { useSharedWorkspace, SharedTask } from './useSharedWorkspace';
import { useAppTheme } from './ThemeContext';
import { auth } from './firebaseConfig';
import AddTaskModal from './AddTaskModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SharedCalendarsScreen() {
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets(); 
    
    // Hallway Data
    const { calendars, createCalendar, joinCalendar, deleteCalendar, leaveCalendar } = useSharedCalendars();
    const [activeWorkspace, setActiveWorkspace] = useState<SharedCalendar | null>(null);
    
    // Workspace Data
    const { tasks, addTask, toggleTask, deleteTask, editTask } = useSharedWorkspace(activeWorkspace?.id || null);

    // Hallway Form State
    const [newGroupName, setNewGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [errorText, setErrorText] = useState('');

    // Workspace UI State
    const [viewMode, setViewMode] = useState('Month'); 
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<SharedTask | null>(null);

    // --- HALLWAY LOGIC ---
    const handleCreate = () => { if (newGroupName.trim() !== '') { createCalendar(newGroupName); setNewGroupName(''); } };
    const handleJoin = async () => {
        if (joinCode.trim() === '') return;
        const success = await joinCalendar(joinCode);
        if (success) { setJoinCode(''); setErrorText(''); } 
        else setErrorText('Invalid Group Code or missing permissions.');
    };
    const copyToClipboard = async (id: string) => {
        await Clipboard.setStringAsync(id);
        Alert.alert("Copied!", "Group invite code copied to clipboard.");
    };

    // --- WORKSPACE DATE MATH ---
    const adjustDate = (days: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const generateWeekDays = () => {
        const current = new Date(selectedDate + 'T12:00:00');
        const startOfWeek = new Date(current);
        startOfWeek.setDate(current.getDate() - current.getDay()); 
        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            week.push(date.toISOString().split('T')[0]);
        }
        return week;
    };

    const weekDaysStr = generateWeekDays();
    const currentMonthName = new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { month: 'long', year: 'numeric' });
    const fullDateName = new Date(selectedDate + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    // --- WORKSPACE LOGIC ---
    const selectedDayTasks = tasks.filter(task => task.dueDate && task.dueDate.split('T')[0] === selectedDate);
    
    const generateMarkedDates = () => {
        const marks: any = {};
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = task.dueDate.split('T')[0];
                marks[dateKey] = { marked: true, dotColor: colors.secondary };
            }
        });
        marks[selectedDate] = { 
            ...(marks[selectedDate] || {}), 
            selected: true, selectedColor: colors.primary 
        };
        return marks;
    };

    // ==========================================
    // VIEW 1: THE INTERIOR WORKSPACE
    // ==========================================
    if (activeWorkspace) {
        return (
            <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
                
                {/* Back Button & Workspace Header */}
                <View style={[styles.workspaceHeader, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
                    <TouchableOpacity onPress={() => setActiveWorkspace(null)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.workspaceTitle, { color: colors.text }]}>{activeWorkspace.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Shared Group Workspace</Text>
                    </View>
                </View>

                {/* View Mode Chips */}
                <View style={styles.chipRow}>
                    {['Month', 'Week', 'Day'].map((mode) => {
                        const isActive = viewMode === mode;
                        return (
                            <TouchableOpacity 
                                key={mode} 
                                style={[
                                    styles.chip, 
                                    { backgroundColor: colors.card },
                                    isActive && { backgroundColor: colors.primary + '30' }
                                ]} 
                                onPress={() => setViewMode(mode)}
                            >
                                <Text style={[
                                    styles.chipText, 
                                    { color: colors.textSecondary },
                                    isActive && { color: colors.primary, fontWeight: 'bold' }
                                ]}>{mode}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* --- MONTH VIEW --- */}
                {viewMode === 'Month' && (
                    <View style={[styles.calendarWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Calendar
                            current={selectedDate}
                            onDayPress={(day: any) => setSelectedDate(day.dateString)}
                            markedDates={generateMarkedDates()}
                            enableSwipeMonths={true}
                            hideArrows={false}
                            theme={{
                                calendarBackground: colors.card,
                                textSectionTitleColor: colors.textSecondary,
                                selectedDayBackgroundColor: colors.primary,
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: colors.primary,
                                dayTextColor: colors.text,
                                textDisabledColor: colors.textSecondary + '50',
                                monthTextColor: colors.text,
                                arrowColor: colors.primary,
                            }}
                        />
                    </View>
                )}

                {/* --- WEEK VIEW --- */}
                {viewMode === 'Week' && (
                    <View style={[styles.calendarWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.navHeader}>
                            <TouchableOpacity onPress={() => adjustDate(-7)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
                            <Text style={[styles.navHeaderText, { color: colors.text }]}>{currentMonthName}</Text>
                            <TouchableOpacity onPress={() => adjustDate(7)}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
                        </View>
                        
                        <View style={styles.weekRow}>
                            {weekDaysStr.map(dayStr => {
                                const dateObj = new Date(dayStr + 'T12:00:00');
                                const dayLetter = dateObj.toLocaleDateString([], { weekday: 'narrow' }); 
                                const dayNumber = dateObj.getDate();
                                const isSelected = dayStr === selectedDate;
                                const dayTasks = tasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === dayStr).slice(0, 3);

                                return (
                                    <TouchableOpacity 
                                        key={dayStr} 
                                        style={[styles.weekDayBlock, isSelected && { backgroundColor: colors.primary }]}
                                        onPress={() => setSelectedDate(dayStr)}
                                    >
                                        <Text style={[styles.weekDayLetter, { color: colors.textSecondary }, isSelected && { color: 'white' }]}>{dayLetter}</Text>
                                        <Text style={[styles.weekDayNumber, { color: colors.text }, isSelected && { color: 'white' }]}>{dayNumber}</Text>
                                        <View style={styles.dotRow}>
                                            {dayTasks.map((t, i) => (
                                                <View key={i} style={[styles.miniDot, { backgroundColor: colors.secondary }]} />
                                            ))}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* --- DAY VIEW --- */}
                {viewMode === 'Day' && (
                    <View style={[styles.navHeader, { backgroundColor: colors.card, padding: 16, borderRadius: 12, elevation: 2, marginBottom: 16 }]}>
                        <TouchableOpacity onPress={() => adjustDate(-1)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={[styles.navHeaderText, { color: colors.text }]}>{fullDateName}</Text>
                        <TouchableOpacity onPress={() => adjustDate(1)}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                )}

                {/* The Task List */}
                <View style={styles.taskListHeader}>
                    <Text style={[styles.taskHeaderText, { color: colors.primary }]}>Group Tasks for {viewMode === 'Day' ? 'Today' : selectedDate}</Text>
                </View>

                {/* THE FIX: Web-Safe Padding */}
                <ScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 80 : 80 + insets.bottom }} 
                    showsVerticalScrollIndicator={false}
                >
                    {selectedDayTasks.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>No events for this day.</Text>
                    ) : (
                        selectedDayTasks.map((task) => (
                            <View key={task.id} style={[
                                styles.taskCard, 
                                { backgroundColor: colors.card },
                                task.isCompleted && { backgroundColor: isDark ? '#2A2A2A' : '#f0f0f0', opacity: 0.7 }
                            ]}>
                                <View style={styles.taskRow}>
                                    <TouchableOpacity onPress={() => toggleTask(task)}>
                                        <Ionicons name={task.isCompleted ? "checkbox" : "square-outline"} size={24} color={task.isCompleted ? colors.textSecondary : colors.primary} />
                                    </TouchableOpacity>
                                    
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.taskTitle, { color: colors.text }, task.isCompleted && { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>{task.title}</Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Due: {new Date(task.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>

                                    <TouchableOpacity style={{ marginRight: 12 }} onPress={() => { setTaskToEdit(task); setIsAddModalVisible(true); }}>
                                        <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => deleteTask(task.id)}>
                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* THE FIX: Web-Safe Positioning */} 
                <TouchableOpacity 
                    style={[
                        styles.fab, 
                        { 
                            backgroundColor: colors.primary,
                            bottom: Platform.OS === 'web' ? 20 : Math.max(20, insets.bottom + 20) 
                        }
                    ]} 
                    onPress={() => { setTaskToEdit(null); setIsAddModalVisible(true); }}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>

                <AddTaskModal 
                    visible={isAddModalVisible} 
                    categories={[{ id: 'group', name: 'Group Event', colorHex: 4280391423 }]} 
                    taskToEdit={taskToEdit as any} 
                    onClose={() => setIsAddModalVisible(false)} 
                    onAddCategory={() => {}} onDeleteCategory={() => {}}
                    onSave={(title, dueDate, category, repeatType, repeatDays, populateDuration, taskId) => {
                        if (taskId) editTask(taskId, title, dueDate, category);
                        else addTask(title, dueDate, category);
                        setSelectedDate(dueDate.split('T')[0]); 
                    }} 
                />
            </SafeAreaView>
        );
    }

    // ==========================================
    // VIEW 2: THE HALLWAY (GROUP LIST)
    // ==========================================
    return (
        <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView 
                style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} 
                contentContainerStyle={{ paddingBottom: 40 }} 
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E1E1E' : '#EADDFF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                    <Ionicons name="people" size={24} color={isDark ? colors.primary : '#21005D'} />
                    <Text style={[styles.infoText, { color: isDark ? colors.text : '#21005D' }]}>Shared Calendars are private workspaces. Events created inside these groups will not mix with your main Household database.</Text>
                </View>

                <Text style={[styles.sectionHeader, { color: colors.text }]}>Your Workspaces</Text>
                
                {calendars.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>You haven't joined any groups yet.</Text>
                ) : (
                    calendars.map(cal => {
                        const isOwner = cal.ownerId === auth.currentUser?.uid;
                        return (
                            <View key={cal.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="folder-open" size={24} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>{cal.name}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{cal.members.length} {cal.members.length === 1 ? 'Member' : 'Members'} {isOwner ? ' • You are the Owner' : ''}</Text>
                                    </View>
                                </View>

                                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>INVITE CODE</Text>
                                <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Text style={[styles.codeText, { color: colors.text }]} selectable>{cal.id}</Text>
                                    <TouchableOpacity onPress={() => copyToClipboard(cal.id)}>
                                        <Ionicons name="copy-outline" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => setActiveWorkspace(cal)}>
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Open Workspace</Text>
                                    </TouchableOpacity>
                                    
                                    {isOwner ? (
                                        <TouchableOpacity style={styles.iconBtn} onPress={() => deleteCalendar(cal.id)}>
                                            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={styles.iconBtn} onPress={() => leaveCalendar(cal.id, cal.members)}>
                                            <Ionicons name="exit-outline" size={24} color="#FF3B30" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}

                <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 32 }]}>Create or Join</Text>
                <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Create a New Group</Text>
                    <View style={styles.inputRow}>
                        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="e.g., Florida Trip 2026" placeholderTextColor={colors.textSecondary} value={newGroupName} onChangeText={setNewGroupName} />
                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Create</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.divider, marginVertical: 24 }]} />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Join via Invite Code</Text>
                    <View style={styles.inputRow}>
                        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }, errorText ? { borderColor: '#FF3B30' } : {}]} placeholder="Paste Group ID here..." placeholderTextColor={colors.textSecondary} value={joinCode} onChangeText={(text) => { setJoinCode(text); setErrorText(''); }} />
                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.secondary }]} onPress={handleJoin}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Join</Text>
                        </TouchableOpacity>
                    </View>
                    {errorText ? <Text style={{ color: '#FF3B30', fontSize: 12, marginTop: 8 }}>{errorText}</Text> : null}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
    infoText: { flex: 1, marginLeft: 12, fontSize: 14, lineHeight: 20 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
    card: { padding: 16, borderRadius: 12, elevation: 2, marginBottom: 16, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    divider: { height: 1, marginVertical: 16 },
    codeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', marginBottom: 16 },
    codeText: { fontSize: 14, fontFamily: 'monospace', letterSpacing: 1 },
    actionRow: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 12 },
    iconBtn: { padding: 8 },
    formCard: { padding: 20, borderRadius: 12, elevation: 2, borderWidth: 1 },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
    inputRow: { flexDirection: 'row' },
    input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 48, marginRight: 8, fontSize: 16 },
    submitBtn: { paddingHorizontal: 20, height: 48, borderRadius: 8, justifyContent: 'center' },
    
    // WORKSPACE UI STYLES
    workspaceHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 16 },
    backBtn: { padding: 8, marginRight: 8 },
    workspaceTitle: { fontSize: 20, fontWeight: 'bold' },
    calendarWrapper: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 20, elevation: 2 },
    taskListHeader: { marginBottom: 12, marginLeft: 4 },
    taskHeaderText: { fontSize: 18, fontWeight: 'bold' },
    taskCard: { padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
    taskRow: { flexDirection: 'row', alignItems: 'center' },
    taskTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },

    // NEW STYLES: Chips and Nav Elements
    chipRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 16 },
    chip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
    chipText: { fontWeight: '500' },
    navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    navHeaderText: { fontSize: 18, fontWeight: 'bold' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingBottom: 8 },
    weekDayBlock: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
    weekDayLetter: { fontSize: 12, marginBottom: 4 },
    weekDayNumber: { fontSize: 16, fontWeight: 'bold' },
    dotRow: { flexDirection: 'row', marginTop: 6, height: 4 },
    miniDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 }
});