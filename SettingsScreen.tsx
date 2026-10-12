import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { auth } from './firebaseConfig';
import { useSettings } from './useSettings';
import { useAppTheme } from './ThemeContext'; 

export default function SettingsScreen() {
    const { householdId, generateInviteCode, joinHousehold, disconnectHousehold } = useSettings();
    const { colors, theme, saveTheme, savePrimaryColor, saveSecondaryColor, saveCustomBgColor, saveCustomTextColor } = useAppTheme();

    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [codeInput, setCodeInput] = useState('');
    const [joinError, setJoinError] = useState(false);
    
    // Slider & Modal State
    const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
    const [editingColorType, setEditingColorType] = useState<'primary' | 'secondary' | 'customBg' | 'customText'>('primary');
    
    const [sliderR, setSliderR] = useState(0);
    const [sliderG, setSliderG] = useState(0);
    const [sliderB, setSliderB] = useState(0);

    // Helper: Converts Hex to RGB so sliders start in the correct position
    const openColorPicker = (type: 'primary' | 'secondary' | 'customBg' | 'customText', currentHex: string) => {
        const hex = currentHex.replace('#', '');
        setSliderR(parseInt(hex.substring(0, 2), 16) || 0);
        setSliderG(parseInt(hex.substring(2, 4), 16) || 0);
        setSliderB(parseInt(hex.substring(4, 6), 16) || 0);
        setEditingColorType(type);
        setIsColorPickerVisible(true);
    };

    // Calculate real-time hex from the 3 sliders
    const previewHex = `#${Math.round(sliderR).toString(16).padStart(2, '0')}${Math.round(sliderG).toString(16).padStart(2, '0')}${Math.round(sliderB).toString(16).padStart(2, '0')}`.toUpperCase();

    const saveMixedColor = () => {
        if (editingColorType === 'primary') savePrimaryColor(previewHex);
        else if (editingColorType === 'secondary') saveSecondaryColor(previewHex);
        else if (editingColorType === 'customBg') saveCustomBgColor(previewHex);
        else if (editingColorType === 'customText') saveCustomTextColor(previewHex);
        setIsColorPickerVisible(false);
    };

    const handleGenerate = async () => { 
        try { const code = await generateInviteCode(); setGeneratedCode(code); } 
        catch (e) { console.error("Error generating code", e); }
    };

    const handleJoin = async () => { 
        if (codeInput.length !== 6) return setJoinError(true);
        const success = await joinHousehold(codeInput);
        if (success) { setCodeInput(''); setJoinError(false); } 
        else setJoinError(true);
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
            
            <Text style={[styles.sectionHeader, { color: colors.text }]}>Account</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={{ color: colors.textSecondary }}>Logged in as:</Text>
                <Text style={[styles.emailText, { color: colors.text }]}>{auth.currentUser?.email || 'dev@calendar.com'}</Text>
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Household Sync</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                
                {/* 1. THE GUEST UI (Only shows if they are synced to someone else) */}
                {householdId && householdId !== auth.currentUser?.uid ? (
                    <View>
                        <Text style={[{ color: colors.primary, fontWeight: 'bold', marginBottom: 4 }]}>✓ Synced to a Household Database</Text>
                        <Text style={{ color: colors.textSecondary }}>Your calendar and chores are live-syncing.</Text>
                        
                        <TouchableOpacity style={[styles.button, { backgroundColor: '#FF3B30', marginTop: 20 }]} onPress={disconnectHousehold}>
                            <Text style={styles.buttonText}>Disconnect Device</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        {/* 2. THE HOST UI */}
                        <Text style={{ color: colors.textSecondary }}>Link devices to share tasks and chores.</Text>
                        
                        {/* THE FIX: Reveal the code to the Host right here! */}
                        {generatedCode ? (
                            <View style={[styles.codeBox, { borderColor: colors.border, backgroundColor: colors.background, marginTop: 20 }]}>
                                <Text style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Household Invite Code</Text>
                                <Text style={[styles.codeText, { color: colors.text }]} selectable={true}>
                                    {generatedCode}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                                    Give this code to your partner to sync their device.
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleGenerate}>
                                <Text style={styles.buttonText}>Generate Invite Code</Text>
                            </TouchableOpacity>
                        )}
                        
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        <View style={styles.joinRow}>
                            <TextInput 
                                style={[styles.input, { borderColor: colors.border, color: colors.text }]} 
                                placeholder="Enter 6-Digit Code" placeholderTextColor={colors.textSecondary}
                                value={codeInput} onChangeText={(text) => { setCodeInput(text); setJoinError(false); }}
                                keyboardType="numeric" maxLength={6}
                            />
                            <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.primary }]} onPress={handleJoin}>
                                <Text style={styles.buttonText}>Join</Text>
                            </TouchableOpacity>
                        </View>
                        {joinError && <Text style={styles.errorText}>Invalid or expired code.</Text>}
                    </View>
                )}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text }]}>Appearance</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                
                <View style={[styles.segmentedControl, { borderColor: colors.border }]}>
                    {['System', 'Light', 'Dark', 'Custom'].map(option => (
                        <TouchableOpacity 
                            key={option} 
                            style={[
                                styles.segmentBtn, { backgroundColor: colors.card },
                                theme === option && { backgroundColor: colors.primary + '20' }
                            ]}
                            onPress={() => saveTheme(option)}
                        >
                            <Text style={[
                                styles.segmentText, { color: colors.textSecondary },
                                theme === option && { color: colors.primary, fontWeight: 'bold' }
                            ]}>{option}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {theme === 'Custom' && (
                    <>
                        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                        
                        <TouchableOpacity style={styles.colorRow} onPress={() => openColorPicker('primary', colors.primary)}>
                            <Text style={[styles.colorLabel, { color: colors.text }]}>Custom Primary Accent</Text>
                            <View style={[styles.colorCircle, { backgroundColor: colors.primary }]} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.colorRow} onPress={() => openColorPicker('secondary', colors.secondary)}>
                            <Text style={[styles.colorLabel, { color: colors.text }]}>Custom Secondary Accent</Text>
                            <View style={[styles.colorCircle, { backgroundColor: colors.secondary }]} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.colorRow} onPress={() => openColorPicker('customBg', colors.background)}>
                            <Text style={[styles.colorLabel, { color: colors.text }]}>Custom Background</Text>
                            <View style={[styles.colorCircle, { backgroundColor: colors.background }]} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.colorRow} onPress={() => openColorPicker('customText', colors.text)}>
                            <Text style={[styles.colorLabel, { color: colors.text }]}>Custom Text Color</Text>
                            <View style={[styles.colorCircle, { backgroundColor: colors.text }]} />
                        </TouchableOpacity>
                    </>
                )}
            </View>
            <View style={{ height: 80 }} />

            {/* --- NEW: RGB SLIDER MODAL --- */}
            <Modal visible={isColorPickerVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.colorModalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Mix Color</Text>
                        
                        {/* Real-time Color Preview Box */}
                        <View style={[styles.previewBox, { backgroundColor: previewHex, borderColor: colors.border }]} />
                        <Text style={[styles.hexText, { color: colors.textSecondary }]}>{previewHex}</Text>

                        {/* Red Slider */}
                        <Text style={[styles.sliderLabel, { color: '#FF3B30' }]}>Red</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={255} step={1}
                            value={sliderR} onValueChange={setSliderR}
                            minimumTrackTintColor="#FF3B30" thumbTintColor="#FF3B30"
                        />

                        {/* Green Slider */}
                        <Text style={[styles.sliderLabel, { color: '#34C759' }]}>Green</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={255} step={1}
                            value={sliderG} onValueChange={setSliderG}
                            minimumTrackTintColor="#34C759" thumbTintColor="#34C759"
                        />

                        {/* Blue Slider */}
                        <Text style={[styles.sliderLabel, { color: '#007AFF' }]}>Blue</Text>
                        <Slider style={styles.slider} minimumValue={0} maximumValue={255} step={1}
                            value={sliderB} onValueChange={setSliderB}
                            minimumTrackTintColor="#007AFF" thumbTintColor="#007AFF"
                        />

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.background }]} onPress={() => setIsColorPickerVisible(false)}>
                                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={saveMixedColor}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save Color</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, marginTop: 16, marginLeft: 4 },
    card: { padding: 16, borderRadius: 12, elevation: 2 },
    emailText: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
    button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    codeBox: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16, borderWidth: 1, borderStyle: 'dashed' },
    codeText: { fontSize: 36, fontWeight: 'bold', marginVertical: 8, letterSpacing: 4 },
    divider: { height: 1, marginVertical: 16 },
    joinRow: { flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 48, marginRight: 8, fontSize: 16, letterSpacing: 2 },
    joinButton: { paddingHorizontal: 24, height: 48, borderRadius: 8, justifyContent: 'center' },
    errorText: { color: '#FF3B30', fontSize: 12, marginTop: 8 },
    segmentedControl: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    segmentText: {},
    colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    colorLabel: { fontSize: 16, fontWeight: '500' },
    colorCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#ccc', elevation: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    colorModalCard: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    previewBox: { height: 80, borderRadius: 12, borderWidth: 2, width: '100%', marginBottom: 8 },
    hexText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 16, letterSpacing: 2 },
    sliderLabel: { fontSize: 14, fontWeight: 'bold', marginTop: 8, marginLeft: 8 },
    slider: { width: '100%', height: 40 },
    modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
    cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#ccc' },
    cancelText: { fontWeight: 'bold', fontSize: 16 },
    saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginLeft: 8 }
});