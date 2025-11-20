/**
 * iPad Optimized Layout Component
 * 
 * Layout specificamente ottimizzato per iPad che gestisce
 * orientamento landscape e portrait in modo intelligente
 */

import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { IPadBanner } from './IPadWarning';

interface IPadOptimizedLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showBanner?: boolean;
  enableSidebar?: boolean; // Per layout a due colonne in landscape
  sidebar?: React.ReactNode;
  scrollable?: boolean;
}

export const IPadOptimizedLayout: React.FC<IPadOptimizedLayoutProps> = ({
  children,
  style,
  showBanner = true,
  enableSidebar = false,
  sidebar,
  scrollable = true
}) => {
  const { 
    deviceInfo, 
    isIPad, 
    getContentPadding,
    styles: responsiveStyles 
  } = useResponsiveLayout();

  const isLandscape = deviceInfo.orientation === 'landscape';
  const shouldShowSidebar = enableSidebar && sidebar && isIPad && isLandscape;
  const contentPadding = getContentPadding();

  const containerStyle = [
    styles.container,
    {
      paddingHorizontal: contentPadding,
      maxWidth: isIPad ? (isLandscape ? 1200 : 800) : '100%',
      alignSelf: 'center'
    },
    style
  ];

  const mainContent = (
    <View style={containerStyle}>
      {showBanner && isIPad && <IPadBanner />}
      
      {shouldShowSidebar ? (
        // Layout a due colonne per iPad landscape
        <View style={styles.landscapeLayout}>
          <View style={styles.mainColumn}>
            {children}
          </View>
          <View style={styles.sidebarColumn}>
            {sidebar}
          </View>
        </View>
      ) : (
        // Layout normale
        <View style={styles.singleColumn}>
          {children}
        </View>
      )}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mainContent}
      </ScrollView>
    );
  }

  return mainContent;
};

// Componente per card ottimizzate iPad
interface IPadCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export const IPadCard: React.FC<IPadCardProps> = ({ 
  children, 
  style, 
  elevated = true 
}) => {
  const { isIPad } = useResponsiveLayout();
  
  return (
    <View style={[
      styles.card,
      isIPad && styles.cardIPad,
      elevated && (isIPad ? styles.cardElevatedIPad : styles.cardElevated),
      style
    ]}>
      {children}
    </View>
  );
};

// Componente per sezioni ottimizzate iPad
interface IPadSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const IPadSection: React.FC<IPadSectionProps> = ({ 
  title, 
  children, 
  style 
}) => {
  const { isIPad, styles: responsiveStyles } = useResponsiveLayout();
  
  return (
    <View style={[styles.section, isIPad && styles.sectionIPad, style]}>
      {title && (
        <Text style={[
          responsiveStyles.text.large,
          styles.sectionTitle,
          isIPad && styles.sectionTitleIPad
        ]}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  landscapeLayout: {
    flexDirection: 'row',
    gap: 24,
    flex: 1,
  },
  mainColumn: {
    flex: 2,
  },
  sidebarColumn: {
    flex: 1,
    minWidth: 300,
  },
  singleColumn: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardIPad: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardElevatedIPad: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  section: {
    marginBottom: 24,
  },
  sectionIPad: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitleIPad: {
    marginBottom: 20,
  },
});

// Import necessario per Text
import { Text } from 'react-native';
