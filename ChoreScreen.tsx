import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChores } from './useChores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from './ThemeContext'; 
import { db, auth } from './firebaseConfig'; 

export default function ChoreScreen() {
    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const todayIndex = new Date().getDay(); 
    const defaultDay = todayIndex === 0 ? 'SUNDAY' : daysOfWeek[todayIndex - 1];
    
    const [selectedDay, setSelectedDay] = useState(defaultDay);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newChoreTitle, setNewChoreTitle] = useState('');
    const [newChoreDay, setNewChoreDay] = useState(defaultDay);

    // THE FIX: Pulling the new dishwasher state and toggle function
    const { chores, addChore, toggleChoreCompletion, deleteChore, resetWeek, dishwasherStatus, toggleDishwasher } = useChores();
    
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();

    const dailyChores = chores.filter(c => c.dayOfWeek === selectedDay);
    const weeklyProgress = chores.length > 0 ? chores.filter(c => c.isCompleted).length / chores.length : 0;
    const dailyProgress = dailyChores.length > 0 ? dailyChores.filter(c => c.isCompleted).length / dailyChores.length : 0;

    const handleSaveChore = () => {
        if (newChoreTitle.trim() === '') return;
        addChore(newChoreTitle, newChoreDay);
        setNewChoreTitle('');
        setIsModalVisible(false);
        setSelectedDay(newChoreDay); 
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            
            <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
                {weeklyProgress === 1 && chores.length > 0 && (
                    <Text style={[styles.confettiText, { color: colors.primary }]}>✨ House has been Cleaned! ✨</Text>
                )}
                
                <View style={styles.progressRow}>
                    <Text style={{ color: colors.textSecondary }}>Weekly Progress</Text>
                    <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(weeklyProgress * 100)}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#EADDFF' }]}>
                    <View style={[styles.progressBarFill, { width: `${weeklyProgress * 100}%`, backgroundColor: colors.primary }]} />
                </View>

                <View style={[styles.progressRow, { marginTop: 16 }]}>
                    <Text style={{ color: colors.textSecondary }}>Daily Progress</Text>
                    <Text style={[styles.progressPercent, { color: colors.secondary }]}>{Math.round(dailyProgress * 100)}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#EADDFF' }]}>
                    <View style={[styles.progressBarFill, { width: `${dailyProgress * 100}%`, backgroundColor: colors.secondary }]} />
                </View>
            </View>

            <View style={styles.daySelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {daysOfWeek.map((day) => {
                        const isActive = selectedDay === day;
                        return (
                            <TouchableOpacity 
                                key={day} 
                                style={[
                                    styles.dayChip, 
                                    { backgroundColor: colors.card },
                                    isActive && { backgroundColor: colors.primary + '30' } 
                                ]}
                                onPress={() => setSelectedDay(day)}
                            >
                                <Text style={[
                                    styles.dayChipText, 
                                    { color: colors.textSecondary },
                                    isActive && { color: colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {day.substring(0, 3)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* NEW: Dishwasher Status Button */}
            <TouchableOpacity 
                style={[
                    styles.dishwasherButton, 
                    { backgroundColor: dishwasherStatus === 'clean' ? '#4CAF50' : '#FF9800' }
                ]} 
                onPress={toggleDishwasher}
            >
                <Ionicons 
                    name={dishwasherStatus === 'clean' ? "water" : "restaurant"} 
                    size={24} 
                    color="white" 
                />
                <Text style={styles.dishwasherButtonText}>
                    Dishwasher is {dishwasherStatus === 'clean' ? 'CLEAN' : 'DIRTY'}
                </Text>
            </TouchableOpacity>

            <ScrollView 
                style={styles.choreList} 
                contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
                showsVerticalScrollIndicator={false}
            >
                {dailyChores.length === 0 ? (
                    <Text style={styles.emptyText}>No chores assigned for {selectedDay}.</Text>
                ) : (
                    dailyChores.map((chore) => (
                        <View key={chore.id} style={[
                            styles.choreCard, 
                            { backgroundColor: colors.card },
                            chore.isCompleted && { backgroundColor: isDark ? '#2A2A2A' : '#f0f0f0', opacity: 0.7 }
                        ]}>
                            <TouchableOpacity style={styles.checkbox} onPress={() => toggleChoreCompletion(chore)}>
                                <Ionicons 
                                    name={chore.isCompleted ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={chore.isCompleted ? colors.textSecondary : colors.primary} 
                                />
                            </TouchableOpacity>
                            <Text style={[
                                styles.choreTitle, 
                                { color: colors.text },
                                chore.isCompleted && { color: colors.textSecondary, textDecorationLine: 'line-through' }
                            ]}>{chore.title}</Text>
                            
                            <TouchableOpacity onPress={() => deleteChore(chore.id)}>
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
                
                {chores.length > 0 && (
                    <TouchableOpacity style={[styles.resetButton, { borderColor: colors.primary }]} onPress={resetWeek}>
                        <Text style={[styles.resetButtonText, { color: colors.primary }]}>Start Fresh Week (Reset All)</Text>
                    </TouchableOpacity>
                )}
                <View style={{ height: 80 }} /> 
            </ScrollView>

            <TouchableOpacity 
                style={[
                    styles.fab, 
                    { 
                        backgroundColor: colors.primary,
                        bottom: 20 + insets.bottom 
                    }
                ]} 
                onPress={() => setIsModalVisible(true)}
            >
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="fade" transparent={true}>
                <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.primary }]}>Add Chore</Text>
                            
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Chore Name</Text>
                            <TextInput 
                                style={[styles.input, { borderColor: colors.border, color: colors.text }]} 
                                placeholderTextColor={colors.textSecondary}
                                placeholder="e.g., Take out Trash" 
                                value={newChoreTitle}
                                onChangeText={setNewChoreTitle}
                                autoFocus
                            />

                            <Text style={[styles.label, { color: colors.textSecondary }]}>Assigned Day</Text>
                            <View style={styles.dayGrid}>
                                {daysOfWeek.map(day => {
                                    const isActive = newChoreDay === day;
                                    return (
                                        <TouchableOpacity 
                                            key={day} 
                                            style={[
                                                styles.gridChip, 
                                                { backgroundColor: isDark ? '#333' : '#e0e0e0' },
                                                isActive && { backgroundColor: colors.primary }
                                            ]}
                                            onPress={() => setNewChoreDay(day)}
                                        >
                                            <Text style={[
                                                styles.gridChipText, 
                                                { color: colors.textSecondary },
                                                isActive && { color: 'white' }
                                            ]}>
                                                {day.substring(0, 3)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.footer}>
                                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: isDark ? '#333' : '#f5f5f5' }]} onPress={() => setIsModalVisible(false)}>
                                    <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveChore}>
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    progressCard: { padding: 16, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 16 },
    confettiText: { fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 12 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    progressPercent: { fontWeight: 'bold' },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    daySelectorContainer: { marginBottom: 16 },
    dayChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
    dayChipText: { fontWeight: '500' },
    choreList: { flex: 1 },
    emptyText: { textAlign: 'center', color: 'gray', marginTop: 40 },
    choreCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
    checkbox: { marginRight: 12 },
    choreTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
    resetButton: { marginTop: 24, paddingVertical: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
    resetButtonText: { fontWeight: 'bold', fontSize: 16 },
    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { borderRadius: 20, padding: 24, elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 48, marginBottom: 20, fontSize: 16 },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    gridChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    gridChipText: { fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 8, borderRadius: 8 },
    cancelText: { fontWeight: 'bold', fontSize: 16 },
    saveButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginLeft: 8, borderRadius: 8 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    
    // NEW: Dishwasher Button Styles
    dishwasherButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    dishwasherButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8, letterSpacing: 1 }
});