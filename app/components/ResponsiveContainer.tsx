/**
 * Responsive Container Component
 * 
 * Container che si adatta automaticamente a iPhone e iPad
 * con layout ottimizzati per entrambi i dispositivi
 */

import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { IPadBanner } from './IPadWarning';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  showIPadBanner?: boolean;
  scrollable?: boolean;
  centerContent?: boolean;
  maxWidth?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  contentStyle,
  showIPadBanner = true,
  scrollable = false,
  centerContent = false,
  maxWidth
}) => {
  const { styles: responsiveStyles, isIPad, deviceInfo } = useResponsiveLayout();

  const containerStyle = [
    responsiveStyles.container,
    maxWidth && { maxWidth },
    centerContent && { justifyContent: 'center' },
    style
  ];

  const innerContentStyle = [
    responsiveStyles.content,
    contentStyle
  ];

  const content = (
    <View style={containerStyle}>
      {showIPadBanner && isIPad && <IPadBanner />}
      <View style={innerContentStyle}>
        {children}
      </View>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[
          { flexGrow: 1 },
          centerContent && { justifyContent: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};

// Componente per grid responsivi
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  style?: ViewStyle;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 2,
  spacing = 16,
  style
}) => {
  const { getColumns, isIPad } = useResponsiveLayout();
  const actualColumns = getColumns(columns);
  
  const childrenArray = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  
  for (let i = 0; i < childrenArray.length; i += actualColumns) {
    rows.push(childrenArray.slice(i, i + actualColumns));
  }

  return (
    <View style={[styles.grid, style]}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.gridRow, { marginBottom: spacing }]}>
          {row.map((child, colIndex) => (
            <View 
              key={colIndex} 
              style={[
                styles.gridItem, 
                { 
                  flex: 1,
                  marginRight: colIndex < row.length - 1 ? spacing : 0 
                }
              ]}
            >
              {child}
            </View>
          ))}
          {/* Riempi spazi vuoti se la riga non è completa */}
          {row.length < actualColumns && 
            Array.from({ length: actualColumns - row.length }).map((_, index) => (
              <View 
                key={`empty-${index}`} 
                style={[
                  styles.gridItem, 
                  { 
                    flex: 1,
                    marginRight: index < actualColumns - row.length - 1 ? spacing : 0 
                  }
                ]} 
              />
            ))
          }
        </View>
      ))}
    </View>
  );
};

// Componente per modal responsivi
interface ResponsiveModalContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ResponsiveModalContent: React.FC<ResponsiveModalContentProps> = ({
  children,
  style
}) => {
  const { getModalWidth, isIPad } = useResponsiveLayout();
  
  return (
    <View style={[
      styles.modalContainer,
      {
        width: getModalWidth(),
        maxHeight: isIPad ? '80%' : '90%'
      },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gridItem: {
    // Flex viene impostato dinamicamente
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
