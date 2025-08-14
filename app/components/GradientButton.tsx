import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  StyleProp, 
  TextStyle, 
  ViewStyle, 
  Platform,
  DimensionValue
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  colors?: [string, string];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  startColor?: string;
  endColor?: string;
  type?: 'primary' | 'secondary' | 'success' | 'danger';
}

export default function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  width = '100%',
  height = 50,
  borderRadius = 8,
  startColor,
  endColor,
  type = 'primary'
}: GradientButtonProps) {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  // Determine button colors based on type or provided colors
  const getButtonColors = (): [string, string] => {
    if (startColor && endColor) {
      return [startColor, endColor];
    }

    switch (type) {
      case 'primary':
        return [colors.primary, colors.primaryDark || colors.primary];
      case 'secondary':
        return [colors.secondary || '#EBEBEB', colors.secondaryDark || colors.secondary || '#DEDEDE'];
      case 'success':
        return [colors.success || '#28a745', colors.success || '#218838'];
      case 'danger':
        return [colors.danger || '#dc3545', colors.danger || '#c82333'];
      default:
        return [colors.primary, colors.primaryDark || colors.primary];
    }
  };

  // Get text color based on button type
  const getTextColor = (): string => {
    switch (type) {
      case 'secondary':
        return colors.text;
      default:
        return '#FFFFFF';
    }
  };

  const buttonColors = getButtonColors();
  const textColor = getTextColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { width, height, borderRadius },
        disabled && styles.disabled,
        style
      ]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={buttonColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { borderRadius }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={[styles.text, { color: textColor }, textStyle]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
}); 