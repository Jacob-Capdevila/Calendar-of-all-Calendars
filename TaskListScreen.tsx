import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendar, Task } from './useCalendar';
import AddTaskModal from './AddTaskModal';
import { useAppTheme } from './ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TaskListScreen() {
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    
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

    // NEW: Filter out completed tasks, then sort them by date
    const activeTasks = tasks.filter(t => showCompleted ? true : !t.isCompleted);
    
    const sortedTasks = [...activeTasks].sort((a, b) => {
        const dateA = new Date(a.dueDate || 0).getTime();
        const dateB = new Date(b.dueDate || 0).getTime();
        return dateA - dateB;
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.primary }]}>All Upcoming Events</Text>
                    {/* The count will now dynamically reflect the hidden items */}
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{sortedTasks.length} Active</Text>
                </View>
                
                <View style={styles.toggleGroup}>
                    {/* NEW: Show/Hide Completed Button */}
                    <TouchableOpacity onPress={() => setShowCompleted(!showCompleted)} style={[styles.headerToggle, { backgroundColor: colors.card }]}>
                        <Ionicons 
                            name={showCompleted ? "checkmark-done-circle" : "checkmark-done-circle-outline"} 
                            size={24} 
                            color={showCompleted ? colors.primary : colors.textSecondary} 
                        />
                    </TouchableOpacity>

                    {/* The Google Event Display Toggle */}
                    <TouchableOpacity onPress={toggleExternalEvents} style={[styles.headerToggle, { backgroundColor: colors.card }]}>
                        <Ionicons 
                            name={showExternalEvents ? "logo-google" : "eye-off-outline"} 
                            size={24} 
                            color={showExternalEvents ? "#4285F4" : colors.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1, overflow: 'hidden' }}>
                <ScrollView 
                    style={styles.taskList} 
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'web' ? 100 : 100 + insets.bottom }} 
                    showsVerticalScrollIndicator={false}
                >
                    {sortedTasks.length === 0 ? (
                        <Text style={{textAlign: 'center', color: colors.textSecondary, marginTop: 40}}>You have no upcoming events.</Text>
                    ) : (
                        sortedTasks.map((task) => {
                            const dateObj = new Date(task.dueDate!);
                            const displayDate = dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                            const displayTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <View key={task.id} style={[ styles.taskCard, { backgroundColor: colors.card }, task.isCompleted && { backgroundColor: isDark ? '#2A2A2A' : '#f0f0f0', opacity: 0.7 } ]}>
                                    <View style={styles.taskRow}>
                                        <TouchableOpacity onPress={() => toggleTaskCompletion(task)}>
                                            <Ionicons name={task.isCompleted ? "checkbox" : "square-outline"} size={24} color={task.isCompleted ? colors.textSecondary : colors.primary} />
                                        </TouchableOpacity>
                                        
                                        <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(task.category) }]} />
                                        
                                        <View style={{ flex: 1 }}>
                                            <Text style={[ styles.taskTitle, { color: colors.text }, task.isCompleted && { color: colors.textSecondary, textDecorationLine: 'line-through' } ]}>{task.title}</Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                {displayDate} at {displayTime}
                                            </Text>
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
                            );
                        })
                    )}
                </ScrollView>
            </View>

            <TouchableOpacity style={[ styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 20 : 20 + insets.bottom } ]} onPress={() => { setTaskToEdit(null); setIsAddModalVisible(true); }}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
            
            <AddTaskModal 
                visible={isAddModalVisible} categories={categories} taskToEdit={taskToEdit} 
                onClose={() => setIsAddModalVisible(false)} onAddCategory={addCategory} onDeleteCategory={deleteCategory} 
                onSave={(title, dueDate, category, repeatType, repeatDays, populateDuration, taskId) => {
                    if (taskId) editTask(taskId, title, dueDate, category, repeatType, repeatDays);
                    else addTask(title, dueDate, category, repeatType, repeatDays, populateDuration);
                }} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, overflow: 'hidden' }, 
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 14, marginTop: 4 },
    toggleGroup: { flexDirection: 'row', gap: 8 },
    headerToggle: { padding: 10, borderRadius: 20, elevation: 2 },
    taskList: { flex: 1 },
    taskCard: { padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    taskRow: { flexDirection: 'row', alignItems: 'center' },
    categoryDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 12 },
    taskTitle: { fontSize: 16, fontWeight: '500' },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, zIndex: 100 }
});