import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

interface SessionButtonsProps {
  onAddDrink: () => void;
  onAddFood: () => void;
  onEndSession: () => void;
}

/**
 * Componente che mostra i pulsanti per gestire la sessione attiva
 */
export default function SessionButtons({ onAddDrink, onAddFood, onEndSession }: SessionButtonsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#5D69BE' }]} 
          onPress={onAddDrink}
        >
          <Ionicons name="beer" size={22} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.actionButtonText}>Aggiungi Bevanda</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} 
          onPress={onAddFood}
        >
          <Ionicons name="restaurant" size={22} color="#ffffff" style={styles.buttonIcon} />
          <Text style={styles.actionButtonText}>Aggiungi Cibo</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.endButton} 
        onPress={onEndSession}
      >
        <Text style={styles.endButtonText}>Termina Sessione</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  endButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FF5252',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  endButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 