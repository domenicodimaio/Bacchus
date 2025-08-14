import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SegmentOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  values: SegmentOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  style?: any;
}

export default function SegmentedControl({
  values,
  selectedValue,
  onChange,
  style
}: SegmentedControlProps) {
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;

  return (
    <View style={[styles.container, style, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {values.map((option, index) => {
        const isSelected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              index === 0 && styles.firstOption,
              index === values.length - 1 && styles.lastOption,
              isSelected && [styles.selectedOption, { backgroundColor: colors.primary }],
              index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border }
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                { color: isSelected ? '#FFFFFF' : colors.text }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  firstOption: {
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  lastOption: {
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
  },
}); 