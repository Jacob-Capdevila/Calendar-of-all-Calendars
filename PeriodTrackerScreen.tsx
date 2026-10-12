import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform, TextInput } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePeriodTracker } from './usePeriodTracker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PeriodTrackerScreen() {
    const { logs, addLog, deleteLog, getStats } = usePeriodTracker();
    const { avgCycle, variance, nextPrediction } = getStats();
    
    const insets = useSafeAreaInsets();

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [hasEndDate, setHasEndDate] = useState(false);
    
    // Pickers for Android
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const today = new Date().toLocaleDateString('en-CA'); // Local YYYY-MM-DD

    const handleSaveLog = () => {
        const startStr = startDate.toLocaleDateString('en-CA');
        const endStr = hasEndDate ? endDate.toLocaleDateString('en-CA') : null;
        
        addLog(startStr, endStr);
        setIsModalVisible(false);
        setHasEndDate(false);
    };

    const getDatesInRange = (start: string, end: string) => {
        const dates = [];
        let curr = new Date(start + 'T12:00:00');
        const last = new Date(end + 'T12:00:00');
        while (curr <= last) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    };

    const generateMarkedDates = () => {
        const marks: any = {};

        if (nextPrediction) {
            const predictedDates = getDatesInRange(nextPrediction.start, nextPrediction.end);
            predictedDates.forEach(date => {
                marks[date] = { startingDay: date === nextPrediction.start, endingDay: date === nextPrediction.end, color: '#FFCDD2', textColor: '#C2185B' };
            });
        }

        logs.forEach(log => {
            const end = log.endDate || today; 
            const logDates = getDatesInRange(log.startDate, end);
            logDates.forEach(date => {
                marks[date] = { startingDay: date === log.startDate, endingDay: date === end, color: '#D32F2F', textColor: 'white' };
            });
        });

        if (!marks[today]) {
            marks[today] = { marked: true, dotColor: '#C2185B' };
        }

        return marks;
    };

    return (
        <SafeAreaView edges={['bottom']} style={styles.container}>
            
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Platform.OS === 'web' ? 100 : 100 + insets.bottom }
                ]}
            >
                {/* Vital Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="refresh" size={24} color="#C2185B" />
                        <Text style={styles.statLabel}>Average Cycle</Text>
                        <Text style={styles.statValue}>{logs.length >= 2 ? `${avgCycle} Days` : "N/A"}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="calendar" size={24} color="#C2185B" />
                        <Text style={styles.statLabel}>Prediction Variance</Text>
                        <Text style={[styles.statValue, variance !== null && variance <= 2.0 && { color: '#388E3C' }]}>
                            {variance !== null ? `± ${variance.toFixed(1)} Days` : "Need Data"}
                        </Text>
                    </View>
                </View>

                {/* Crimson Calendar UI */}
                <View style={styles.calendarCard}>
                    <Calendar
                        current={today}
                        markingType={'period'} 
                        markedDates={generateMarkedDates()}
                        enableSwipeMonths={true}
                        theme={{ todayTextColor: '#C2185B', arrowColor: '#C2185B' }}
                    />
                </View>

                <Text style={styles.historyTitle}>Summoning History</Text>

                {/* Vertical Timeline */}
                <View style={styles.timeline}>
                    {logs.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: 'gray', marginTop: 20 }}>No records found. The realm is safe.</Text>
                    ) : (
                        logs.map((log) => {
                            const duration = log.endDate ? 
                                Math.ceil(Math.abs(new Date(log.endDate).getTime() - new Date(log.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 
                                : null;

                            return (
                                <View key={log.id} style={styles.timelineRow}>
                                    <View style={styles.stemContainer}>
                                        <View style={styles.stemDot} />
                                        <View style={styles.stemLine} />
                                    </View>
                                    <View style={styles.historyCard}>
                                        <View>
                                            <Text style={styles.historyDate}>
                                                {new Date(log.startDate + 'T12:00:00').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                            <Text style={styles.historyDuration}>
                                                {duration ? `Duration: ${duration} Days` : "Currently Active"}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => deleteLog(log.id)}>
                                            <Ionicons name="trash-outline" size={20} color="gray" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Bulletproof FAB Layout */}
            <TouchableOpacity 
                style={[
                    styles.fab,
                    { bottom: Platform.OS === 'web' ? 20 : Math.max(20, 20 + insets.bottom) }
                ]} 
                onPress={() => setIsModalVisible(true)}
            >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.fabText}>Log Appearance</Text>
            </TouchableOpacity>

            {/* --- ADD LOG MODAL --- */}
            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Log Appearance</Text>

                        {/* Start Date */}
                        <Text style={styles.label}>Start Date</Text>
                        {Platform.OS === 'ios' && (
                            <DateTimePicker value={startDate} mode="date" display="default" onChange={(e, d) => d && setStartDate(d)} />
                        )}
                        {Platform.OS === 'android' && (
                            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                                <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        )}
                        {/* THE FIX: Injected HTML5 Native Web Calendar for Start Date */}
                        {Platform.OS === 'web' && (
                            React.createElement('input', {
                                type: 'date',
                                value: startDate.toLocaleDateString('en-CA'),
                                onChange: (e: any) => {
                                    const parsed = new Date(e.target.value + 'T12:00:00');
                                    if (!isNaN(parsed.getTime())) setStartDate(parsed);
                                },
                                style: {
                                    width: '100%', height: '48px', borderRadius: '8px', borderWidth: '1px', 
                                    borderStyle: 'solid', borderColor: '#ccc', paddingLeft: '12px', paddingRight: '12px',
                                    fontSize: '16px', backgroundColor: 'white', color: '#333', outline: 'none',
                                    fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px', cursor: 'pointer'
                                }
                            })
                        )}
                        {showStartPicker && Platform.OS === 'android' && (
                            <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowStartPicker(false); d && setStartDate(d); }} />
                        )}

                        <View style={styles.divider} />

                        {/* End Date Toggle */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={styles.label}>End Date (Optional)</Text>
                            <TouchableOpacity onPress={() => setHasEndDate(!hasEndDate)}>
                                <Ionicons name={hasEndDate ? "checkbox" : "square-outline"} size={28} color="#C2185B" />
                            </TouchableOpacity>
                        </View>

                        {hasEndDate && (
                            <>
                                {Platform.OS === 'ios' && (
                                    <DateTimePicker value={endDate} mode="date" display="default" onChange={(e, d) => d && setEndDate(d)} />
                                )}
                                {Platform.OS === 'android' && (
                                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                                        <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                )}
                                {/* THE FIX: Injected HTML5 Native Web Calendar for End Date */}
                                {Platform.OS === 'web' && (
                                    React.createElement('input', {
                                        type: 'date',
                                        value: endDate.toLocaleDateString('en-CA'),
                                        onChange: (e: any) => {
                                            const parsed = new Date(e.target.value + 'T12:00:00');
                                            if (!isNaN(parsed.getTime())) setEndDate(parsed);
                                        },
                                        style: {
                                            width: '100%', height: '48px', borderRadius: '8px', borderWidth: '1px', 
                                            borderStyle: 'solid', borderColor: '#ccc', paddingLeft: '12px', paddingRight: '12px',
                                            fontSize: '16px', backgroundColor: 'white', color: '#333', outline: 'none',
                                            fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '16px', cursor: 'pointer'
                                        }
                                    })
                                )}
                                {showEndPicker && Platform.OS === 'android' && (
                                    <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowEndPicker(false); d && setEndDate(d); }} />
                                )}
                            </>
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsModalVisible(false); setHasEndDate(false); }}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog}>
                                <Text style={styles.saveText}>Save Log</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollContent: { padding: 16 }, 
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: 'white', marginHorizontal: 4, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
    statLabel: { color: 'gray', fontSize: 12, marginTop: 8 },
    statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4, color: '#D32F2F' },
    calendarCard: { backgroundColor: 'white', borderRadius: 12, padding: 8, elevation: 4, marginBottom: 24 },
    historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#333' },
    timeline: { marginTop: 8 },
    timelineRow: { flexDirection: 'row', marginBottom: 16 },
    stemContainer: { alignItems: 'center', paddingHorizontal: 8 },
    stemDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#C2185B' },
    stemLine: { width: 2, flex: 1, backgroundColor: '#ccc', marginTop: 4 },
    historyCard: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginLeft: 8, elevation: 2 },
    historyDate: { fontWeight: 'bold', fontSize: 16, color: '#333' },
    historyDuration: { color: '#D32F2F', fontWeight: 'bold', marginTop: 4 },
    
    fab: { position: 'absolute', right: 20, backgroundColor: '#D32F2F', flexDirection: 'row', paddingHorizontal: 20, height: 56, borderRadius: 28, alignItems: 'center', elevation: 4 },
    fabText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#C2185B', marginBottom: 20 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 8 },
    dateButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, height: 48, justifyContent: 'center', marginBottom: 16 },
    dateText: { fontSize: 16, color: '#333' },
    dateTextInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, height: 48, fontSize: 16, color: '#333', marginBottom: 16 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
    cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginRight: 8, borderRadius: 8, backgroundColor: '#f5f5f5' },
    cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
    saveButton: { flex: 1, paddingVertical: 14, alignItems: 'center', marginLeft: 8, borderRadius: 8, backgroundColor: '#C2185B' },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});