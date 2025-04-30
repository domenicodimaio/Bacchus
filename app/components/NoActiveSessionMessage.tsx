import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NoActiveSessionMessageProps {
  onStartSession: () => void;
}

/**
 * Componente che mostra un messaggio e un pulsante quando non ci sono sessioni attive
 */
export default function NoActiveSessionMessage({ onStartSession }: NoActiveSessionMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="beer-outline" size={80} color="#5D69BE" style={styles.icon} />
        
        <Text style={styles.title}>Nessuna sessione attiva</Text>
        
        <Text style={styles.description}>
          Inizia una nuova sessione per monitorare il tuo consumo di alcol e calcolare il tasso alcolemico (BAC).
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={onStartSession}>
          <Text style={styles.buttonText}>Inizia Sessione</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
    maxWidth: 400,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#5D69BE',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 