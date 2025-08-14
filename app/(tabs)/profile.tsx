import React from 'react';
import { View, StyleSheet } from 'react-native';

// 🔧 FIX CRITICO: Import profiles direttamente invece di redirect
import ProfilesScreen from '../profiles/index';

export default function ProfileTab() {
  // 🔧 FIX: Render profiles direttamente - NO PIU' REDIRECT!
  return <ProfilesScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 