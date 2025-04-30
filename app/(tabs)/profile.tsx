import React from 'react';
import { Redirect } from 'expo-router';
import CustomTabBar from '../components/CustomTabBar';
import { View, StyleSheet } from 'react-native';

export default function ProfileTab() {
  // Reindirizza a /profiles mantenendo il tab bar
  return (
    <View style={styles.container}>
      <Redirect href="/profiles" />
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 