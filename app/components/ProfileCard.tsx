import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserProfile } from '../lib/services/session.service';
import { formatTimeToSober } from '../utils/bacCalculator';

interface ProfileCardProps {
  profile?: UserProfile;
  sessionStart?: Date | string;
  sessionDuration?: string;
}

/**
 * Componente che mostra il profilo dell'utente e le informazioni sulla sessione attiva
 */
export default function ProfileCard({ profile, sessionStart, sessionDuration }: ProfileCardProps) {
  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Nessun profilo disponibile</Text>
      </View>
    );
  }

  // Formatta la data di inizio sessione
  const formattedStartTime = sessionStart instanceof Date 
    ? sessionStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : new Date(sessionStart || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={[styles.emojiContainer, profile.color ? { backgroundColor: profile.color } : null]}>
            <Text style={styles.emoji}>{profile.emoji || '🍺'}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.userName}>{profile.name}</Text>
            <Text style={styles.userDetails}>
              {profile.gender === 'male' ? 'Uomo' : 'Donna'}, {profile.weightKg} kg
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.sessionInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Inizio</Text>
          <Text style={styles.infoValue}>{formattedStartTime}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Durata</Text>
          <Text style={styles.infoValue}>{sessionDuration || '0h 0m'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
}); 