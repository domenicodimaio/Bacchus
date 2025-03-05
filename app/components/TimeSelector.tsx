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

interface TimeSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ 
  value, 
  onChange, 
  label = 'Orario' 
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  
  // Gestisce il cambiamento di data/ora
  const handleChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || value;
    
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    setTempDate(currentDate);
    
    if (Platform.OS === 'ios') {
      // Su iOS, la conferma avviene con il pulsante "Done"
    } else {
      // Su Android, ogni selezione è una conferma
      onChange(currentDate);
    }
  };
  
  // Conferma la selezione su iOS
  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };
  
  // Imposta l'orario attuale
  const handleNow = () => {
    const now = new Date();
    onChange(now);
    setTempDate(now);
  };
  
  // Formatta l'orario per la visualizzazione
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      
      <View style={styles.timeContainer}>
        <TouchableOpacity 
          style={[styles.timeButton, { backgroundColor: colors.cardBackground }]} 
          onPress={() => setShowPicker(true)}
        >
          <Text style={[styles.timeText, { color: colors.text }]}>
            {formatTime(value)}
          </Text>
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.nowButton, { backgroundColor: colors.primary }]}
          onPress={handleNow}
        >
          <Text style={styles.nowButtonText}>
            {t('now')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {Platform.OS === 'android' ? (
        // Android usa il picker nativo
        showPicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleChange}
          />
        )
      ) : (
        // iOS usa un modal personalizzato
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={[styles.pickerContainer, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity 
                  onPress={() => setShowPicker(false)}
                  style={styles.cancelButton}
                >
                  <Text style={[styles.headerButtonText, { color: colors.danger }]}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
                
                <Text style={[styles.pickerTitle, { color: colors.text }]}>
                  {label}
                </Text>
                
                <TouchableOpacity 
                  onPress={handleConfirm}
                  style={styles.doneButton}
                >
                  <Text style={[styles.headerButtonText, { color: colors.primary }]}>
                    {t('done')}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={tempDate}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleChange}
                textColor={colors.text}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nowButton: {
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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