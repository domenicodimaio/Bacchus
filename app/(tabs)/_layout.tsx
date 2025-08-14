import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import CustomTabBar from '../components/CustomTabBar';

export default function TabLayout() {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // 🔧 FIX: Usa CustomTabBar carino invece del tab bar nativo brutto
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Contenuto delle schermate */}
      <Slot />
      
      {/* Tab bar carino personalizzato */}
      <CustomTabBar />
    </View>
  );
} 