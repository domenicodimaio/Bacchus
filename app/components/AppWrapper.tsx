import React, { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

type AppWrapperProps = {
  children: ReactNode;
};

export default function AppWrapper({ children }: AppWrapperProps) {
  const { height, width } = useWindowDimensions();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background} 
      />
      <SafeAreaView 
        style={[
          styles.container, 
          { 
            backgroundColor: colors.background,
            width,
            minHeight: height
          }
        ]}
      >
        <View style={styles.content}>
          {children}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
}); 