import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState('System');
    
    // The Custom Sandbox Variables
    const [primaryColor, setPrimaryColor] = useState('#6750A4');
    const [secondaryColor, setSecondaryColor] = useState('#625B71');
    const [customBgColor, setCustomBgColor] = useState('#121212');
    const [customTextColor, setCustomTextColor] = useState('#00FF00');

    const systemColorScheme = useColorScheme();

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('themeMode') || 'System';
            const savedPrimary = await AsyncStorage.getItem('primaryColor') || '#6750A4';
            const savedSecondary = await AsyncStorage.getItem('secondaryColor') || '#625B71';
            const savedCustomBg = await AsyncStorage.getItem('customBgColor') || '#121212';
            const savedCustomText = await AsyncStorage.getItem('customTextColor') || '#00FF00';
            
            setTheme(savedTheme);
            setPrimaryColor(savedPrimary);
            setSecondaryColor(savedSecondary);
            setCustomBgColor(savedCustomBg);
            setCustomTextColor(savedCustomText);
        };
        loadTheme();
    }, []);

    const saveTheme = async (newTheme: string) => {
        setTheme(newTheme);
        await AsyncStorage.setItem('themeMode', newTheme);
    };

    const savePrimaryColor = async (color: string) => {
        setPrimaryColor(color);
        await AsyncStorage.setItem('primaryColor', color);
    };

    const saveSecondaryColor = async (color: string) => {
        setSecondaryColor(color);
        await AsyncStorage.setItem('secondaryColor', color);
    };

    const saveCustomBgColor = async (color: string) => {
        setCustomBgColor(color);
        await AsyncStorage.setItem('customBgColor', color);
    };

    const saveCustomTextColor = async (color: string) => {
        setCustomTextColor(color);
        await AsyncStorage.setItem('customTextColor', color);
    };

    const isDark = theme === 'System' ? systemColorScheme === 'dark' : theme === 'Dark';

    // THE STRICT SEPARATION ENGINE
    // If 'Custom' is active, use the user's hex codes. Otherwise, enforce the defaults!
    const colors = {
        primary: theme === 'Custom' ? primaryColor : '#6750A4',
        secondary: theme === 'Custom' ? secondaryColor : '#625B71',
        background: theme === 'Custom' ? customBgColor : (isDark ? '#121212' : '#f5f5f5'),
        card: theme === 'Custom' ? customBgColor : (isDark ? '#1E1E1E' : 'white'),
        text: theme === 'Custom' ? customTextColor : (isDark ? '#FFFFFF' : '#333333'),
        textSecondary: theme === 'Custom' ? customTextColor + '80' : (isDark ? '#AAAAAA' : 'gray'), // 80 adds 50% transparency to hex
        border: theme === 'Custom' ? customTextColor + '40' : (isDark ? '#333333' : '#ccc'),
        divider: theme === 'Custom' ? customTextColor + '20' : (isDark ? '#2A2A2A' : '#eee')
    };

    return (
        <ThemeContext.Provider value={{ 
            isDark, colors, theme, 
            saveTheme, savePrimaryColor, saveSecondaryColor,
            saveCustomBgColor, saveCustomTextColor
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useAppTheme = () => useContext(ThemeContext);