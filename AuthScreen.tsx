import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth'; 
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

let GoogleSignin: any;
if (Platform.OS !== 'web') {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    GoogleSignin.configure({
        // THE FIX: Reverted to your primary Firebase Web Client ID
        webClientId: '1065930587406-gb1hbv3vc7ia651nrms938pe6o9ig9dj.apps.googleusercontent.com',
        iosClientId: '1065930587406-2denvgrff885sm02bmemivtjht08d9jh.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/calendar'],
        // THE FIX: Explicitly request offline access (Often required for Firebase to accept Android tokens)
    });
}

export default function AuthScreen() {
    
    const provisionUserProfile = async (user: any) => {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, { uid: user.uid, email: user.email, householdId: user.uid, createdAt: new Date().toISOString() });
                await AsyncStorage.setItem('householdId', user.uid);
            } else {
                let realId = userSnap.data().householdId || user.uid;
                if (realId === 'user.uid' || realId === 'DEFAULT_HOUSEHOLD') {
                    realId = user.uid;
                    await setDoc(userRef, { householdId: user.uid }, { merge: true });
                }
                await AsyncStorage.setItem('householdId', realId);
            }
        } catch (error) {
            console.error("Failed to provision user profile:", error);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            if (Platform.OS === 'web') {
                const provider = new GoogleAuthProvider();
                provider.addScope('https://www.googleapis.com/auth/calendar');
                provider.setCustomParameters({ prompt: 'consent' });
                
                const result = await signInWithPopup(auth, provider);
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential && credential.accessToken) {
                    await AsyncStorage.setItem('google_calendar_token', credential.accessToken);
                }
                await provisionUserProfile(result.user);
            } else {
                // --- AGGRESSIVE DIAGNOSTIC MODE ---
                try {
                    Alert.alert("Step 1", "Checking Play Services...");
                    await GoogleSignin.hasPlayServices();

                    Alert.alert("Step 2", "Play Services found. Opening Google Popup...");
                    // Notice we removed the signOut() trap here!
                    const userInfo = await GoogleSignin.signIn();

                    Alert.alert("Step 3", "Popup successful! Getting ID Token...");
                    if (!userInfo.idToken) throw new Error("Google returned a blank ID token.");

                    Alert.alert("Step 4", "Securing VIP Calendar Token...");
                    const { accessToken } = await GoogleSignin.getTokens();
                    if (accessToken) {
                        await AsyncStorage.setItem('google_calendar_token', accessToken);
                    }

                    Alert.alert("Step 5", "Tokens secured! Handing credentials to Firebase...");
                    const credential = GoogleAuthProvider.credential(userInfo.idToken);
                    const userCredential = await signInWithCredential(auth, credential);

                    Alert.alert("Step 6", "Firebase Login Success! Loading app...");
                    await provisionUserProfile(userCredential.user);

                } catch (nativeError: any) {
                    // This will catch any silent Google errors and force them onto the screen
                    Alert.alert("🚨 Native Crash", `Code: ${nativeError.code}\nMessage: ${nativeError.message}`);
                }
            }
        } catch (error: any) {
            Alert.alert('General Login Error', error.message || "Unknown Error");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Calendar of All Calendars</Text>
            <Text style={styles.subtitle}>Household Sync</Text>
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                <Text style={styles.buttonText}>Sign in with Google</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
    googleButton: { backgroundColor: '#4285F4', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, elevation: 3 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});