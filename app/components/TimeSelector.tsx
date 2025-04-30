import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { formatTime } from '../utils/dateUtils';

export interface TimeSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  nowLabel?: string;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ 
  value, 
  onChange, 
  label = 'Orario',
  nowLabel = 'Now'
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || value;
    setShowDatePicker(Platform.OS === 'ios');
    setTempDate(currentDate);
      onChange(currentDate);
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || value;
    setShowTimePicker(Platform.OS === 'ios');
    setTempDate(currentTime);
    onChange(currentTime);
  };

  const setNow = () => {
    onChange(new Date());
  };
  
  // Formato semplice per la data
  const formatDateSimple = (date: Date) => {
    return date.toLocaleDateString();
  };
  
  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      
      <View style={styles.selectors}>
        <View style={styles.dateTimeContainer}>
          <TouchableOpacity
            style={[styles.dateSelector, { backgroundColor: colors.cardBackground }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDateSimple(value)}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          
        <TouchableOpacity 
            style={[styles.timeSelector, { backgroundColor: colors.cardBackground }]}
            onPress={() => setShowTimePicker(true)}
        >
          <Text style={[styles.timeText, { color: colors.text }]}>
            {formatTime(value)}
          </Text>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.nowButton, { backgroundColor: colors.secondary }]}
          onPress={setNow}
        >
          <Text style={styles.nowButtonText}>
            {nowLabel}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showDatePicker && (
          <DateTimePicker
            value={tempDate}
          mode="date"
            display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
      
      {showTimePicker && (
              <DateTimePicker
                value={tempDate}
                mode="time"
                is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  selectors: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 3,
    marginRight: 6,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 2,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  nowButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  nowButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 4,
  },
  doneButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  picker: {
    height: 200,
  },
});

export default TimeSelector; 