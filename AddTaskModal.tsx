import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Category, Task } from './useCalendar';
import { useAppTheme } from './ThemeContext'; 

interface AddTaskModalProps {
    visible: boolean;
    categories: Category[];
    taskToEdit?: Task | null;
    onClose: () => void;
    // THE FIX: Added endTime to the signature
    onSave: (title: string, dueDate: string, category: string, repeatType: string, repeatDays: string, populateDuration: string, taskId?: string, endTime?: string | null) => void;
    onAddCategory: (name: string, colorHex: string) => void;
    onDeleteCategory: (id: string) => void;
}

export default function AddTaskModal({ visible, categories, taskToEdit, onClose, onSave, onAddCategory, onDeleteCategory }: AddTaskModalProps) {
    const { colors, isDark } = useAppTheme(); 

    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    
    // NEW: End Time States
    const [hasEndTime, setHasEndTime] = useState(false);
    const [endDate, setEndDate] = useState(new Date());
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

    const [selectedCategory, setSelectedCategory] = useState('Default');
    const [repeatType, setRepeatType] = useState('NONE');
    const [selectedDays, setSelectedDays] = useState<number[]>([]); 
    const [populateDuration, setPopulateDuration] = useState('1 Month');

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#6750A4'); 
    
    const repeatOptions = ['NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'];
    const weekDays = [ { label: 'S', value: 0 }, { label: 'M', value: 1 }, { label: 'T', value: 2 }, { label: 'W', value: 3 }, { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 } ];
    const colorPalette = ['#E53935', '#D81B60', '#8E24AA', '#1E88E5', '#00ACC1', '#43A047', '#FDD835', '#FB8C00', '#F4511E', '#6750A4', '#625B71', '#333333'];
    const displayCategories = categories.length > 0 ? categories : [{ id: '0', name: 'Default', colorHex: 4286611584 }];

    useEffect(() => {
        if (visible) {
            if (taskToEdit) {
                setTitle(taskToEdit.title); setSelectedCategory(taskToEdit.category);
                const parsedStart = taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : new Date();
                setDate(parsedStart);
                
                // Load existing end time or default to 1 hour later
                if (taskToEdit.endTime) {
                    setHasEndTime(true);
                    setEndDate(new Date(taskToEdit.endTime));
                } else {
                    setHasEndTime(false);
                    setEndDate(new Date(parsedStart.getTime() + 60 * 60 * 1000));
                }

                setRepeatType(taskToEdit.repeatType || 'NONE');
                setSelectedDays(taskToEdit.repeatDays ? taskToEdit.repeatDays.split(',').map(Number) : []);
            } else {
                setTitle(''); setSelectedCategory('Default'); 
                const now = new Date();
                setDate(now);
                setHasEndTime(false);
                setEndDate(new Date(now.getTime() + 60 * 60 * 1000));
                setRepeatType('NONE'); setSelectedDays([]); setPopulateDuration('1 Month');
            }
            setIsAddingCategory(false); setIsManagingCategories(false);
        }
    }, [visible, taskToEdit]);

    const getHexColor = (num: number) => {
        let hex = num.toString(16).toUpperCase();
        if (hex.startsWith('-')) hex = (num >>> 0).toString(16).toUpperCase();
        return hex.length >= 8 ? '#' + hex.slice(hex.length - 6) : '#' + hex.padStart(6, '0');
    };

    const formatLocalKotlinTime = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };

    const handleSave = () => {
        if (title.trim() === '') return;
        const daysString = selectedDays.sort().join(',');
        
        // Pass the end time if the toggle is active
        const finalEndTime = hasEndTime ? formatLocalKotlinTime(endDate) : null;
        
        onSave(title, formatLocalKotlinTime(date), selectedCategory, repeatType, daysString, populateDuration, taskToEdit?.id, finalEndTime);
        onClose();
    };

    const toggleDaySelection = (value: number) => {
        if (selectedDays.includes(value)) setSelectedDays(selectedDays.filter(d => d !== value));
        else setSelectedDays([...selectedDays, value]);
    };

    const handleCreateCategory = () => {
        const trimmed = newCategoryName.trim();
        if (trimmed && !displayCategories.some(c => c.name === trimmed)) {
            onAddCategory(trimmed, newCategoryColor); setSelectedCategory(trimmed);
        }
        setIsAddingCategory(false); setNewCategoryName('');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                            <View style={styles.header}>
                                <Text style={[styles.headerText, { color: colors.primary }]}>{taskToEdit ? "Edit Task" : "Add New Task"}</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Task Name</Text>
                                <TextInput 
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]} 
                                    placeholder="e.g., Feed Toothless" placeholderTextColor={colors.textSecondary}
                                    value={title} onChangeText={setTitle} 
                                />

                                <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date & Time</Text>
                                
                                {Platform.OS === 'web' ? (
                                    React.createElement('input', {
                                        type: 'datetime-local',
                                        value: formatLocalKotlinTime(date).substring(0, 16),
                                        onChange: (e: any) => {
                                            const parsed = new Date(e.target.value);
                                            if (!isNaN(parsed.getTime())) {
                                                setDate(parsed);
                                                // Auto-bump end time if start time changes
                                                setEndDate(new Date(parsed.getTime() + 60 * 60 * 1000));
                                            }
                                        },
                                        style: {
                                            width: '100%', height: '48px', borderRadius: '8px', borderWidth: '1px', 
                                            borderStyle: 'solid', borderColor: colors.border, paddingLeft: '12px', paddingRight: '12px',
                                            fontSize: '16px', backgroundColor: colors.card, color: colors.text, outline: 'none',
                                            fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px', cursor: 'pointer'
                                        }
                                    })
                                ) : Platform.OS === 'ios' ? (
                                    <View style={{ alignItems: 'flex-start', marginBottom: 16 }}>
                                        <DateTimePicker value={date} mode="datetime" display="default" onChange={(e, d) => { if(d) { setDate(d); setEndDate(new Date(d.getTime() + 60 * 60 * 1000)); } }} />
                                    </View>
                                ) : (
                                    <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border, marginBottom: 16 }]} onPress={() => { setPickerMode('date'); setShowPicker(true); }}>
                                        <Text style={[styles.dateText, { color: colors.text }]}>{date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TouchableOpacity>
                                )}
                                {showPicker && Platform.OS === 'android' && ( <DateTimePicker value={date} mode={pickerMode} display="default" onChange={(e, d) => { setShowPicker(false); if(d) { setDate(d); setEndDate(new Date(d.getTime() + 60 * 60 * 1000)); } if (pickerMode === 'date') setTimeout(() => { setPickerMode('time'); setShowPicker(true); }, 100); }} /> )}

                                {/* THE FIX: Optional End Time Toggle */}
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity onPress={() => setHasEndTime(!hasEndTime)} style={{ marginRight: 8 }}>
                                        <Ionicons name={hasEndTime ? "checkbox" : "square-outline"} size={24} color={hasEndTime ? colors.primary : colors.textSecondary} />
                                    </TouchableOpacity>
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>Add End Time</Text>
                                </View>

                                {hasEndTime && (
                                    <View style={{ marginBottom: 20 }}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>End Date & Time</Text>
                                        {Platform.OS === 'web' ? (
                                            React.createElement('input', {
                                                type: 'datetime-local',
                                                value: formatLocalKotlinTime(endDate).substring(0, 16),
                                                onChange: (e: any) => {
                                                    const parsed = new Date(e.target.value);
                                                    if (!isNaN(parsed.getTime())) setEndDate(parsed);
                                                },
                                                style: {
                                                    width: '100%', height: '48px', borderRadius: '8px', borderWidth: '1px', 
                                                    borderStyle: 'solid', borderColor: colors.border, paddingLeft: '12px', paddingRight: '12px',
                                                    fontSize: '16px', backgroundColor: colors.card, color: colors.text, outline: 'none',
                                                    fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer'
                                                }
                                            })
                                        ) : Platform.OS === 'ios' ? (
                                            <View style={{ alignItems: 'flex-start' }}>
                                                <DateTimePicker value={endDate} mode="datetime" display="default" onChange={(e, d) => { if(d) setEndDate(d); }} />
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border, marginBottom: 0 }]} onPress={() => { setEndPickerMode('date'); setShowEndPicker(true); }}>
                                                <Text style={[styles.dateText, { color: colors.text }]}>{endDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                            </TouchableOpacity>
                                        )}
                                        {showEndPicker && Platform.OS === 'android' && ( <DateTimePicker value={endDate} mode={endPickerMode} display="default" onChange={(e, d) => { setShowEndPicker(false); if(d) setEndDate(d); if (endPickerMode === 'date') setTimeout(() => { setEndPickerMode('time'); setShowEndPicker(true); }, 100); }} /> )}
                                    </View>
                                )}

                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: hasEndTime ? 20 : 0 }]}>Repeat Interval</Text>
                                <View style={{ marginBottom: 20 }}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                                        {repeatOptions.map(opt => {
                                            const isActive = repeatType === opt;
                                            return (
                                                <TouchableOpacity key={opt} style={[styles.chip, { backgroundColor: isDark ? '#333' : '#e0e0e0' }, isActive && { backgroundColor: colors.primary + '30' }]} onPress={() => setRepeatType(opt)}>
                                                    <Text style={[styles.chipText, { color: colors.textSecondary }, isActive && { color: colors.primary }]}>{opt}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    {repeatType === 'CUSTOM' && (
                                        <View style={[styles.subConfigContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Repeat on these Days:</Text>
                                            <View style={styles.weekdayRow}>
                                                {weekDays.map(day => {
                                                    const isSelected = selectedDays.includes(day.value);
                                                    return (
                                                        <TouchableOpacity key={day.value} style={[styles.dayCircle, { backgroundColor: isDark ? '#444' : '#eee' }, isSelected && { backgroundColor: colors.primary }]} onPress={() => toggleDaySelection(day.value)}>
                                                            <Text style={[styles.dayCircleText, { color: colors.text }, isSelected && { color: 'white' }]}>{day.label}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.categoryHeader}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
                                    {!isAddingCategory && (
                                        <TouchableOpacity onPress={() => setIsManagingCategories(!isManagingCategories)}>
                                            <Text style={[styles.manageText, { color: colors.primary }]}>{isManagingCategories ? "Done" : "Manage"}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={{ marginBottom: 32 }}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                                        {displayCategories.map(cat => {
                                            const isActive = selectedCategory === cat.name;
                                            return (
                                                <TouchableOpacity key={cat.id} style={[styles.chip, { backgroundColor: isDark ? '#333' : '#e0e0e0' }, isActive && { backgroundColor: colors.primary + '30' }]} onPress={() => { if (!isManagingCategories) { setSelectedCategory(cat.name); setIsAddingCategory(false); } }} disabled={isManagingCategories}>
                                                    <View style={[styles.categoryDot, { backgroundColor: getHexColor(cat.colorHex) }]} />
                                                    <Text style={[styles.chipText, { color: colors.textSecondary }, isActive && { color: colors.primary }]}>{cat.name}</Text>
                                                    {isManagingCategories && cat.name !== 'Default' && (
                                                        <TouchableOpacity style={styles.deleteBadge} onPress={() => onDeleteCategory(cat.id)}>
                                                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                                                        </TouchableOpacity>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                        {!isAddingCategory && !isManagingCategories && (
                                            <TouchableOpacity style={[styles.chip, { backgroundColor: colors.background, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }]} onPress={() => setIsAddingCategory(true)}>
                                                <Text style={[styles.chipText, { color: colors.textSecondary }]}>+ New</Text>
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>

                                    {isAddingCategory && (
                                        <View style={[styles.newCategoryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                            <View style={styles.newCategoryContainer}>
                                                <TextInput style={[styles.newCategoryInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]} placeholder="Category Name..." placeholderTextColor={colors.textSecondary} value={newCategoryName} onChangeText={setNewCategoryName} maxLength={12} autoFocus />
                                                <TouchableOpacity style={[styles.addCategoryBtn, { backgroundColor: colors.primary }]} onPress={handleCreateCategory}>
                                                    <Text style={styles.addCategoryText}>Add</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.addCategoryBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => { setIsAddingCategory(false); setNewCategoryName(''); }}>
                                                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={[styles.paletteLabel, { color: colors.textSecondary }]}>Pick a color:</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteRow}>
                                                {colorPalette.map(color => (
                                                    <TouchableOpacity key={color} onPress={() => setNewCategoryColor(color)} style={[ styles.colorCircle, { backgroundColor: color }, newCategoryColor === color && { borderColor: colors.text, borderWidth: 3 } ]}>
                                                        {newCategoryColor === color && <Ionicons name="checkmark" size={16} color={color === '#FFFFFF' || color === '#f5f5f5' ? '#333' : 'white'} />}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.background }]} onPress={onClose}>
                                    <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                                    <Text style={styles.saveText}>Save Task</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerText: { fontSize: 20, fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 48, marginBottom: 20, fontSize: 16 },
    dateButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 48, justifyContent: 'center', marginBottom: 20 },
    dateText: { fontSize: 16 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: -4 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    manageText: { fontWeight: 'bold', fontSize: 14 },
    categoryRow: { flexDirection: 'row', paddingVertical: 4 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, height: 36 },
    categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    chipText: { fontWeight: 'bold' },
    subConfigContainer: { padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1 },
    subLabel: { fontSize: 12, fontWeight: '500' },
    weekdayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    dayCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    dayCircleText: { fontSize: 12, fontWeight: 'bold' },
    deleteBadge: { marginLeft: 8, marginRight: -8 },
    newCategoryBox: { padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1 },
    newCategoryContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    newCategoryInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40 },
    addCategoryBtn: { paddingHorizontal: 16, height: 40, borderRadius: 8, justifyContent: 'center', marginLeft: 8 },
    addCategoryText: { color: 'white', fontWeight: 'bold' },
    paletteLabel: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
    paletteRow: { flexDirection: 'row' },
    colorCircle: { width: 32, height: 32, borderRadius: 16, marginRight: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1 },
    cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 8, borderRadius: 8 },
    cancelText: { fontWeight: 'bold', fontSize: 16 },
    saveButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginLeft: 8, borderRadius: 8 },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});