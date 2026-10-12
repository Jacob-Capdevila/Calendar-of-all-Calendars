import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useCalendar, Task } from './useCalendar';
import AddTaskModal from './AddTaskModal';
import { useAppTheme } from './ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalendarScreen() {
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [viewMode, setViewMode] = useState('Month');
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    
    // NEW: Toggle state for hiding/showing completed tasks
    const [showCompleted, setShowCompleted] = useState(false);
    
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    const { tasks, categories, toggleTaskCompletion, deleteTask, addTask, editTask, addCategory, deleteCategory, showExternalEvents, toggleExternalEvents } = useCalendar();

    const getCategoryColor = (catName: string) => {
        const cat = categories.find(c => c.name === catName);
        if (cat && cat.colorHex) {
            let hex = cat.colorHex.toString(16).toUpperCase();
            if (hex.startsWith('-')) hex = (cat.colorHex >>> 0).toString(16).toUpperCase();
            return hex.length >= 8 ? '#' + hex.slice(hex.length - 6) : '#' + hex.padStart(6, '0');
        }
        return catName === 'Chore' ? '#4CAF50' : catName === 'Group' ? '#1E88E5' : '#808080'; 
    };

    // NEW: Master filter to hide completed tasks unless the toggle is flipped
    const activeTasks = tasks.filter(t => showCompleted ? true : !t.isCompleted);

    const selectedDayTasks = activeTasks.filter(task => task.dueDate && task.dueDate.split('T')[0] === selectedDate);

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

    const generateMarkedDates = () => {
        const marks: any = {};
        // Use activeTasks so completed tasks don't clutter the calendar dots
        activeTasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = task.dueDate.split('T')[0];
                marks[dateKey] = { marked: true, dotColor: getCategoryColor(task.category) };
            }
        });

        if (marks[selectedDate]) marks[selectedDate].selected = true;
        else marks[selectedDate] = { selected: true, selectedColor: colors.primary }; 
        return marks;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.chipRow}>
                {['Month', 'Week', 'Day'].map((mode) => {
                    const isActive = viewMode === mode;
                    return (
                        <TouchableOpacity key={mode} style={[ styles.chip, { backgroundColor: colors.card }, isActive && { backgroundColor: colors.primary + '30' } ]} onPress={() => setViewMode(mode)}>
                            <Text style={[ styles.chipText, { color: colors.textSecondary }, isActive && { color: colors.primary, fontWeight: 'bold' } ]}>{mode}</Text>
                        </TouchableOpacity>
                    );
                })}
                
                <View style={styles.toggleGroup}>
                    {/* NEW: Show/Hide Completed Button */}
                    <TouchableOpacity 
                        style={[ styles.chip, { backgroundColor: colors.card, paddingHorizontal: 12 } ]} 
                        onPress={() => setShowCompleted(!showCompleted)}
                    >
                        <Ionicons 
                            name={showCompleted ? "checkmark-done-circle" : "checkmark-done-circle-outline"} 
                            size={20} 
                            color={showCompleted ? colors.primary : colors.textSecondary} 
                        />
                    </TouchableOpacity>
                    
                    {/* The Google Event Display Toggle */}
                    <TouchableOpacity 
                        style={[ styles.chip, { backgroundColor: colors.card, paddingHorizontal: 12 } ]} 
                        onPress={toggleExternalEvents}
                    >
                        <Ionicons 
                            name={showExternalEvents ? "logo-google" : "eye-off-outline"} 
                            size={20} 
                            color={showExternalEvents ? "#4285F4" : colors.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {viewMode === 'Month' && (
                <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day: any) => setSelectedDate(day.dateString)}
                        markedDates={generateMarkedDates()}
                        enableSwipeMonths={true}
                        theme={{
                            calendarBackground: colors.card, textSectionTitleColor: colors.textSecondary,
                            selectedDayBackgroundColor: colors.primary, selectedDayTextColor: '#ffffff',
                            todayTextColor: colors.primary, dayTextColor: colors.text,
                            textDisabledColor: colors.textSecondary + '50', monthTextColor: colors.text,
                            arrowColor: colors.primary,
                        }}
                    />
                </View>
            )}

            {viewMode === 'Week' && (
                <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
                    <View style={styles.navHeader}>
                        <TouchableOpacity onPress={() => adjustDate(-7)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
                        <Text style={[styles.navHeaderText, { color: colors.text }]}>{currentMonthName}</Text>
                        <TouchableOpacity onPress={() => adjustDate(7)}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
                    </View>
                    <View style={styles.weekRow}>
                        {weekDaysStr.map(dayStr => {
                            const dateObj = new Date(dayStr + 'T12:00:00');
                            const dayTasks = activeTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === dayStr).slice(0, 3);
                            return (
                                <TouchableOpacity key={dayStr} style={[styles.weekDayBlock, dayStr === selectedDate && { backgroundColor: colors.primary }]} onPress={() => setSelectedDate(dayStr)}>
                                    <Text style={[styles.weekDayLetter, { color: colors.textSecondary }, dayStr === selectedDate && { color: 'white' }]}>{dateObj.toLocaleDateString([], { weekday: 'narrow' })}</Text>
                                    <Text style={[styles.weekDayNumber, { color: colors.text }, dayStr === selectedDate && { color: 'white' }]}>{dateObj.getDate()}</Text>
                                    <View style={styles.dotRow}>
                                        {dayTasks.map((t, i) => <View key={i} style={[styles.miniDot, { backgroundColor: getCategoryColor(t.category) }]} /> )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {viewMode === 'Day' && (
                <View style={[styles.navHeader, { backgroundColor: colors.card, padding: 16, borderRadius: 12, elevation: 2 }]}>
                    <TouchableOpacity onPress={() => adjustDate(-1)}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
                    <Text style={[styles.navHeaderText, { color: colors.text }]}>{fullDateName}</Text>
                    <TouchableOpacity onPress={() => adjustDate(1)}><Ionicons name="arrow-forward" size={24} color={colors.text} /></TouchableOpacity>
                </View>
            )}

            <View style={styles.taskListHeader}>
                <Text style={[styles.taskHeaderText, { color: colors.primary }]}>Tasks for {viewMode === 'Day' ? 'Today' : selectedDate}</Text>
            </View>

            <View style={{ flex: 1, overflow: 'hidden' }}>
                <ScrollView 
                    style={styles.taskList} 
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'web' ? 100 : 100 + insets.bottom }} 
                    showsVerticalScrollIndicator={false}
                >
                    {selectedDayTasks.length === 0 ? (
                        <Text style={{textAlign: 'center', color: colors.textSecondary, marginTop: 20}}>No tasks scheduled for this day.</Text>
                    ) : (
                        selectedDayTasks.map((task) => (
                            <View key={task.id} style={[ styles.taskCard, { backgroundColor: colors.card }, task.isCompleted && { backgroundColor: isDark ? '#2A2A2A' : '#f0f0f0', opacity: 0.7 } ]}>
                                <View style={styles.taskRow}>
                                    <TouchableOpacity onPress={() => toggleTaskCompletion(task)}>
                                        <Ionicons name={task.isCompleted ? "checkbox" : "square-outline"} size={24} color={task.isCompleted ? colors.textSecondary : colors.primary} />
                                    </TouchableOpacity>
                                    <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(task.category) }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[ styles.taskTitle, { color: colors.text }, task.isCompleted && { color: colors.textSecondary, textDecorationLine: 'line-through' } ]}>{task.title}</Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Due: {new Date(task.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                    
                                    {!task.isExternal && (
                                        <>
                                            <TouchableOpacity style={{ marginRight: 12 }} onPress={() => { setTaskToEdit(task); setIsAddModalVisible(true); }}>
                                                <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => deleteTask(task.id)}>
                                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            <TouchableOpacity style={[ styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 20 : 20 + insets.bottom } ]} onPress={() => { setTaskToEdit(null); setIsAddModalVisible(true); }}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
            
            <AddTaskModal visible={isAddModalVisible} categories={categories} taskToEdit={taskToEdit} onClose={() => setIsAddModalVisible(false)} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onSave={(title, dueDate, category, repeatType, repeatDays, populateDuration, taskId) => {
                if (taskId) editTask(taskId, title, dueDate, category, repeatType, repeatDays);
                else addTask(title, dueDate, category, repeatType, repeatDays, populateDuration);
                setSelectedDate(dueDate.split('T')[0]); 
            }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, overflow: 'hidden' }, 
    chipRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 16, gap: 10 },
    chip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
    chipText: { fontWeight: '500' },
    toggleGroup: { flexDirection: 'row', marginLeft: 'auto', gap: 8 },
    calendarCard: { borderRadius: 15, padding: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, marginBottom: 12 },
    navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    navHeaderText: { fontSize: 18, fontWeight: 'bold' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingBottom: 8 },
    weekDayBlock: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
    weekDayLetter: { fontSize: 12, marginBottom: 4 },
    weekDayNumber: { fontSize: 16, fontWeight: 'bold' },
    dotRow: { flexDirection: 'row', marginTop: 6, height: 4 },
    miniDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 1 },
    taskListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 },
    taskHeaderText: { fontSize: 18, fontWeight: 'bold' },
    taskList: { flex: 1 },
    taskCard: { padding: 16, borderRadius: 12, marginBottom: 8, elevation: 2 },
    taskRow: { flexDirection: 'row', alignItems: 'center' },
    categoryDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 12 },
    taskTitle: { fontSize: 16, fontWeight: '500' },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 }
});