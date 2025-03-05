import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, ColorSchemeName } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

type HeaderProps = {
  title: string;
  showBack?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  transparent?: boolean;
};

export default function Header({ 
  title, 
  showBack = false, 
  rightIcon, 
  onRightPress,
  transparent = false 
}: HeaderProps) {
  const router = useRouter();
  const { currentTheme } = useTheme();
  const { t } = useTranslation();
  const colors = currentTheme.COLORS;
  const sizes = currentTheme.SIZES;
  const colorScheme = useColorScheme();
  
  const goBack = () => {
    router.back();
  };
  
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: transparent ? 'transparent' : colors.headerBackground,
        height: sizes.headerHeight,
        borderBottomColor: transparent ? 'transparent' : colors.border,
      }
    ]}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={transparent ? 'transparent' : colors.headerBackground}
        translucent={transparent}
      />
      
      {/* Left Section (Back Button) */}
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={goBack}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="chevron-back" 
              size={28} 
              color={colors.headerIcon}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Center Section (Title) */}
      <View style={styles.centerSection}>
        <Text 
          style={[
            styles.title,
            { color: colors.headerText }
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      
      {/* Right Section (Optional Icon) */}
      <View style={styles.rightSection}>
        {rightIcon && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onRightPress}
            activeOpacity={0.7}
            disabled={!onRightPress}
          >
            <Ionicons 
              name={rightIcon} 
              size={24} 
              color={colors.headerIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  leftSection: {
    width: 60,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
}); 