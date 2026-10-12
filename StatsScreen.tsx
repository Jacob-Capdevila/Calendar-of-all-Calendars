import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendar } from './useCalendar';
import { useChores } from './useChores';
import { useAppTheme } from './ThemeContext';

export default function StatsScreen() {
    // 1. Pull the Live Theme
    const { colors, isDark } = useAppTheme();

    // 2. Pull the Live Data from your existing engines
    const { tasks } = useCalendar();
    const { chores } = useChores();

    // --- PRODUCTIVITY MATH ---
    
    // Task Math
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isCompleted).length;
    const pendingTasks = totalTasks - completedTasks;
    const taskPercent = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

    // Chore Math
    const totalChores = chores.length;
    const completedChores = chores.filter(c => c.isCompleted).length;
    const pendingChores = totalChores - completedChores;
    const chorePercent = totalChores > 0 ? (completedChores / totalChores) : 0;

    // Master Score (Combined)
    const combinedTotal = totalTasks + totalChores;
    const combinedCompleted = completedTasks + completedChores;
    const masterScore = combinedTotal > 0 ? (combinedCompleted / combinedTotal) : 0;

    // Dynamic Insight Generator
    const getInsightMessage = () => {
        if (combinedTotal === 0) return "Add some tasks and chores to get started!";
        if (masterScore === 1) return "Perfect score! The house is flawless. Time to relax.";
        if (masterScore >= 0.75) return "You are crushing it this week. Keep up the great momentum!";
        if (masterScore >= 0.50) return "Halfway there! A solid effort so far.";
        return "Plenty of opportunities left to conquer your to-do list.";
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
            
            {/* MASTER SCORE CARD */}
            <View style={[styles.masterCard, { backgroundColor: colors.primary }]}>
                <View style={styles.masterHeader}>
                    <Ionicons name="trophy" size={32} color="white" />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.masterLabel}>Overall Productivity</Text>
                        <Text style={styles.masterValue}>{Math.round(masterScore * 100)}%</Text>
                    </View>
                </View>
                <Text style={styles.insightText}>{getInsightMessage()}</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown</Text>

            {/* TASKS CARD */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Calendar Tasks</Text>
                    <Text style={[styles.percentBadge, { color: colors.primary }]}>{Math.round(taskPercent * 100)}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={[styles.track, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
                    <View style={[styles.fill, { width: `${taskPercent * 100}%`, backgroundColor: colors.primary }]} />
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{completedTasks}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
                    </View>
                    <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{pendingTasks}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                    </View>
                    <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalTasks}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                    </View>
                </View>
            </View>

            {/* CHORES CARD */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.secondary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Chores</Text>
                    <Text style={[styles.percentBadge, { color: colors.secondary }]}>{Math.round(chorePercent * 100)}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={[styles.track, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
                    <View style={[styles.fill, { width: `${chorePercent * 100}%`, backgroundColor: colors.secondary }]} />
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{completedChores}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
                    </View>
                    <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{pendingChores}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                    </View>
                    <View style={styles.statColumn}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{totalChores}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                    </View>
                </View>
            </View>

            {/* QUICK ACTIONS OR INFO */}
            <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E1E1E' : '#EADDFF', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                <Ionicons name="information-circle" size={24} color={isDark ? colors.primary : '#21005D'} />
                <Text style={[styles.infoText, { color: isDark ? colors.text : '#21005D' }]}>
                    Stats are calculated based on the current data synced to your household database. Check off items in the List or Chore views to watch these numbers climb!
                </Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    
    masterCard: { padding: 20, borderRadius: 16, marginBottom: 24, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    masterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    masterLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    masterValue: { color: 'white', fontSize: 36, fontWeight: 'bold' },
    insightText: { color: 'white', fontSize: 16, lineHeight: 22, opacity: 0.95 },
    
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 4, marginBottom: 12 },
    
    card: { padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8, flex: 1 },
    percentBadge: { fontSize: 18, fontWeight: 'bold' },
    
    track: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 20 },
    fill: { height: '100%', borderRadius: 6 },
    
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
    statColumn: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
    statLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },

    infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginTop: 8, alignItems: 'center' },
    infoText: { flex: 1, marginLeft: 12, fontSize: 14, lineHeight: 20 }
});