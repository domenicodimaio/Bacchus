import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'primary' | 'secondary' | 'success' | 'danger';
}

interface FixedFooterProps {
  rightButton?: ButtonProps;
  leftButton?: ButtonProps;
  centerButton?: ButtonProps;
}

export default function FixedFooter({ rightButton, leftButton, centerButton }: FixedFooterProps) {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const insets = useSafeAreaInsets();

  const getButtonColors = (type: string = 'primary'): [string, string] => {
    switch (type) {
      case 'primary':
        return [colors.primary, colors.primaryDark || colors.primary];
      case 'secondary':
        return [colors.secondary || '#EBEBEB', colors.secondary || '#EBEBEB'];
      case 'success':
        return [colors.success || '#28a745', colors.success || '#28a745'];
      case 'danger':
        return [colors.danger || '#dc3545', colors.danger || '#dc3545'];
      default:
        return [colors.primary, colors.primaryDark || colors.primary];
    }
  };

  const getButtonTextColor = (type: string = 'primary') => {
    switch (type) {
      case 'secondary':
        return colors.text;
      default:
        return '#FFFFFF';
    }
  };

  const renderButton = (button: ButtonProps | undefined, align: 'left' | 'center' | 'right') => {
    if (!button) return <View style={styles.buttonContainer} />;

    const { title, onPress, disabled = false, loading = false, type = 'primary' } = button;
    const buttonColors = getButtonColors(type);
    const textColor = getButtonTextColor(type);
    const isSecondary = type === 'secondary';

    return (
      <View style={[styles.buttonContainer, styles[`${align}ButtonContainer`]]}>
        <TouchableOpacity
          style={[
            styles.button,
            isSecondary && { 
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.border
            },
            disabled && styles.disabledButton
          ]}
          onPress={onPress}
          disabled={disabled || loading}
        >
          {!isSecondary ? (
            <LinearGradient
              colors={buttonColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.secondaryButtonContent}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.text }]}>{title}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: colors.cardBackground,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 16
      }
    ]}>
      {renderButton(leftButton, 'left')}
      {renderButton(centerButton, 'center')}
      {renderButton(rightButton, 'right')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  leftButtonContainer: {
    alignItems: 'flex-start',
  },
  centerButtonContainer: {
    alignItems: 'center',
  },
  rightButtonContainer: {
    alignItems: 'flex-end',
  },
  button: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 100,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 