import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, Platform, StatusBar } from 'react-native';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import AuthScreen from './AuthScreen';
import CalendarScreen from './CalendarScreen';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font'; 
import ChoreScreen from './ChoreScreen';
import PeriodTrackerScreen from './PeriodTrackerScreen';
import TaskListScreen from './TaskListScreen';
import StatsScreen from './StatsScreen';
import SettingsScreen from './SettingsScreen';
import { ThemeProvider, useAppTheme } from './ThemeContext';
import SharedCalendarsScreen from './SharedCalendarsScreen';
import { useNotifications } from './useNotifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function MainShell() {
    const [currentView, setCurrentView] = useState('Calendar');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isToolsFolderOpen, setIsToolsFolderOpen] = useState(true);
    const { colors } = useAppTheme();
    useNotifications();
    
    const { expoPushToken } = useNotifications(); 
    console.log("🎯 MY DEVICE TOKEN:", expoPushToken);

    const handleSignOut = async () => {
        try {
            await AsyncStorage.removeItem('householdId');
            await signOut(auth);
            if (Platform.OS !== 'web') {
                try {
                    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
                    await GoogleSignin.signOut();
                } catch (googleError) {
                    console.log("Google native sign out skipped.");
                }
            }
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.mainContent}>
                <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                    <TouchableOpacity onPress={() => setIsDrawerOpen(true)}>
                        <Ionicons name="menu" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.topBarTitle, { color: colors.primary }]}>{currentView} View</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.screenContainer}>
                    {currentView === 'Calendar' && <CalendarScreen />}
                    {currentView === 'List' && <TaskListScreen />}
                    {currentView === 'Chores' && <ChoreScreen />}
                    {currentView === 'Stats' && <StatsScreen />}
                    {currentView === 'Period' && <PeriodTrackerScreen />}
                    {currentView === 'Settings' && <SettingsScreen />}
                    {currentView === 'Groups' && <SharedCalendarsScreen />}
                </View>
            </View>

            {isDrawerOpen && (
                <View style={styles.drawerOverlay}>
                    <TouchableOpacity style={styles.drawerCloseArea} onPress={() => setIsDrawerOpen(false)} />
                    <View style={[styles.drawerContent, { backgroundColor: colors.card }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.drawerHeader}>
                                <Ionicons name="home" size={48} color={colors.primary} />
                                <Text style={[styles.drawerTitle, { color: colors.text }]}>Household Hub</Text>
                                <Text style={[styles.drawerSubtitle, { color: colors.textSecondary }]}>Synced & Secure</Text>
                            </View>
                            
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                            <DrawerItem title="Calendar" icon="calendar" colors={colors} isActive={currentView === 'Calendar'} onPress={() => { setCurrentView('Calendar'); setIsDrawerOpen(false); }} />
                            <DrawerItem title="Shared Calendars" icon="people" colors={colors} isActive={currentView === 'Groups'} onPress={() => { setCurrentView('Groups'); setIsDrawerOpen(false); }} />
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                            <TouchableOpacity style={styles.folderToggle} onPress={() => setIsToolsFolderOpen(!isToolsFolderOpen)}>
                                <Text style={[styles.folderText, { color: colors.text }]}>Household Tools</Text>
                                <Ionicons name={isToolsFolderOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {isToolsFolderOpen && (
                                <View style={styles.subFolder}>
                                    <DrawerItem title="Event List" icon="list" colors={colors} isActive={currentView === 'List'} onPress={() => { setCurrentView('List'); setIsDrawerOpen(false); }} />
                                    <DrawerItem title="Chore List" icon="checkmark-circle" colors={colors} isActive={currentView === 'Chores'} onPress={() => { setCurrentView('Chores'); setIsDrawerOpen(false); }} />
                                    <DrawerItem title="Productivity Stats" icon="star" colors={colors} isActive={currentView === 'Stats'} onPress={() => { setCurrentView('Stats'); setIsDrawerOpen(false); }} />
                                    <DrawerItem title="Demon Tracker" icon="warning" colors={colors} customIconColor="#FF3B30" isActive={currentView === 'Period'} onPress={() => { setCurrentView('Period'); setIsDrawerOpen(false); }} />
                                </View>
                            )}
                            
                            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                            <DrawerItem title="Settings & Themes" icon="settings" colors={colors} isActive={currentView === 'Settings'} onPress={() => { setCurrentView('Settings'); setIsDrawerOpen(false); }} />
                            
                            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                                <Ionicons name="log-out" size={24} color="#FF3B30" />
                                <Text style={styles.logoutText}>Log Out</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [fontsLoaded, fontError] = useFonts({
        ...Ionicons.font,
    });

    useEffect(() => {
        // THE FIX: The global scroll lock. This physically forbids the browser's 
        // outer layers from growing or scrolling, forcing all scroll commands into your lists.
        if (Platform.OS === 'web') {
            const style = document.createElement('style');
            style.textContent = `
                html, body, #root {
                    height: 100%;
                    width: 100%;
                    overflow: hidden;
                }
            `;
            document.head.appendChild(style);
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const userRef = doc(db, 'users', currentUser.uid);
                    await setDoc(userRef, { uid: currentUser.uid, email: currentUser.email }, { merge: true }); 
                } catch (error) {}
            }
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6750A4" />
            </View>
        );
    }

    if (!user) return <AuthScreen />;

    return (
        /* THE FIX: Added style={{ flex: 1 }} to lock the invisible wrapper! */
        <SafeAreaProvider style={{ flex: 1 }}>
            <ThemeProvider>
                <MainShell />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

const DrawerItem = ({ title, icon, isActive, onPress, colors, customIconColor }: any) => (
    <TouchableOpacity style={[styles.drawerItem, isActive && { backgroundColor: colors.primary + '20', borderRadius: 25, marginHorizontal: 8 }]} onPress={onPress}>
        <Ionicons name={icon} size={24} color={isActive ? colors.primary : (customIconColor || colors.textSecondary)} />
        <Text style={[styles.drawerItemText, { color: colors.text }, isActive && { color: colors.primary, fontWeight: 'bold' }]}>{title}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        overflow: 'hidden'
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainContent: { flex: 1 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, elevation: 4 },
    topBarTitle: { fontSize: 20, fontWeight: 'bold' },
    screenContainer: { flex: 1 },
    drawerOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', zIndex: 999, elevation: 100 },
    drawerCloseArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerContent: { width: 300, position: 'absolute', top: 0, bottom: 0, left: 0, elevation: 16 },
    drawerHeader: { padding: 24, paddingTop: 40 },
    drawerTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 12 },
    drawerSubtitle: { fontSize: 14 },
    divider: { height: 1, marginVertical: 8, marginHorizontal: 16 },
    drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 },
    drawerItemText: { fontSize: 16, marginLeft: 16 },
    folderToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 },
    folderText: { fontSize: 16, fontWeight: 'bold' },
    subFolder: { paddingLeft: 16 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, marginTop: 20, marginBottom: 40 },
    logoutText: { fontSize: 16, marginLeft: 16, color: '#FF3B30', fontWeight: 'bold' }
});