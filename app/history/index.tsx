import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import sessionService from '../lib/services/session.service';
import * as sessionServiceDirect from '../lib/services/session.service';
import { Session } from '../types/session';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing
} from 'react-native-reanimated';
import AppHeader from '../components/AppHeader';
import OfflineIndicator from '../components/OfflineIndicator';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';
import PremiumFeatureBlock from '../components/PremiumFeatureBlock';

// Simple enum for export formats
enum ExportFormat {
  CSV = 'csv',
  JSON = 'json'
}

export default function HistoryScreen() {
  const { t: memoizedT } = useTranslation(['session', 'common']);
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const { features, isPremium, canExportData } = usePremiumFeatures();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<{[key: string]: boolean}>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Animated values
  const listOpacity = useSharedValue(0);
  
  // Stile animato per la lista
  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));
  
  // Predefiniamo gli stili animati qui, fuori dalle callback
  const createItemAnimatedStyle = (index: number) => {
    const renderDelay = Math.min(index * 100, 500);
    return {
      opacity: 0,
      transform: [{ translateY: 20 }]
    };
  };
  
  // Creiamo una mappa di stili animati per ogni item
  const [animatedStyles, setAnimatedStyles] = useState<{[key: string]: any}>({});
  
  // Use useCallback for loadSessions to prevent recreating the function on every render
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 LOADING SESSIONS: Forzando caricamento da AsyncStorage...');
      
      // 🔧 FIX CRITICO: Carica prima da AsyncStorage per aggiornare la variabile globale
      await sessionServiceDirect.loadSessionHistoryFromStorage();
      
      // Ora usa la funzione standard per ottenere la cronologia aggiornata
      const history = sessionService.getSessionHistory();
      
      console.log(`✅ LOADING SESSIONS: Caricate ${history.length} sessioni dalla cronologia`);
      
      // Filtro per rimuovere sessioni invalide
      const validSessions = history.filter(session => {
        try {
          if (!session || typeof session !== 'object') return false;
          if (!session.id) return false;
          if (!session.profile || typeof session.profile !== 'object') return false;
          if (!session.profile.id || !session.profile.name) return false;
          if (!Array.isArray(session.drinks)) return false;
          if (!session.startTime) return false;
          return true;
        } catch (error) {
          console.warn('Errore nella validazione della sessione:', error);
          return false;
        }
      });
      
      // Ordinamento sicuro per data
      const sortedSessions = validSessions.sort((a, b) => {
        try {
          const dateA = new Date(a.startTime).getTime();
          const dateB = new Date(b.startTime).getTime();
          return dateB - dateA;
        } catch (error) {
          console.warn('Errore nell\'ordinamento delle sessioni:', error);
          return 0;
        }
      });
      
      setSessions(sortedSessions);
      // Resettiamo la selezione quando carichiamo nuove sessioni
      setSelectedSessions({});
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Errore critico nel caricamento della cronologia sessioni:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load sessions on mount
  useEffect(() => {
    // 🔧 FIX: Handle async loadSessions properly
    loadSessions().catch(error => {
      console.error('Error in useEffect loadSessions:', error);
    });
    // Animate in the list
    listOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, []); // Empty dependency array to run only once on mount
  
  // Use useFocusEffect to reload sessions every time the screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('History screen focused - reloading sessions');
      // 🔧 FIX: Handle async loadSessions properly
      loadSessions().catch(error => {
        console.error('Error in useFocusEffect loadSessions:', error);
      });
      
      return () => {
        // Cleanup function when screen loses focus
      };
    }, [loadSessions])
  );
  
  // Quando le sessioni cambiano, creiamo stili animati per ciascuna
  useEffect(() => {
    const newStyles: {[key: string]: any} = {};
    sessions.forEach((session, index) => {
      if (session && session.id) {
        newStyles[session.id] = createItemAnimatedStyle(index);
      }
    });
    setAnimatedStyles(newStyles);
  }, [sessions]);
  
  // Gestisce la selezione di una sessione
  const toggleSessionSelection = useCallback((sessionId: string) => {
    setSelectedSessions(prevSelected => {
      const newSelected = { ...prevSelected };
      newSelected[sessionId] = !newSelected[sessionId];
      
      // Se non ci sono più selezioni, esci dalla modalità selezione
      const hasSelections = Object.values(newSelected).some(value => value);
      if (!hasSelections) {
        setIsSelectionMode(false);
      }
      
      return newSelected;
    });
  }, []);
  
  // Gestisce l'attivazione della modalità selezione
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    if (isSelectionMode) {
      // Se stiamo uscendo dalla modalità selezione, deseleziona tutto
      setSelectedSessions({});
    }
  }, [isSelectionMode]);
  
  // Seleziona o deseleziona tutte le sessioni
  const toggleSelectAll = useCallback(() => {
    if (sessions.length === 0) return;
    
    // Verifica se tutte le sessioni sono già selezionate
    const allSelected = sessions.every(session => selectedSessions[session.id]);
    
    if (allSelected) {
      // Deseleziona tutte
      setSelectedSessions({});
    } else {
      // Seleziona tutte
      const newSelected: {[key: string]: boolean} = {};
      sessions.forEach(session => {
        newSelected[session.id] = true;
      });
      setSelectedSessions(newSelected);
    }
  }, [sessions, selectedSessions]);

  // Use useCallback for handleDeleteSession to prevent recreating the function on every render
  const handleDeleteSession = useCallback((sessionId: string) => {
    Alert.alert(
      memoizedT('deleteSession'),
      memoizedT('deleteSessionConfirmation'),
      [
        {
          text: memoizedT('cancel', { ns: 'common' }),
          style: 'cancel'
        },
        {
          text: memoizedT('delete', { ns: 'common' }),
          style: 'destructive',
          onPress: () => {
            // Esegui l'eliminazione
            sessionService.deleteSession(sessionId);
            // Ricarica i dati
            loadSessions();
          }
        }
      ]
    );
  }, [memoizedT, loadSessions]);
  
  // Elimina le sessioni selezionate
  const deleteSelectedSessions = useCallback(() => {
    const selectedIds = Object.entries(selectedSessions)
      .filter(([_, selected]) => selected)
      .map(([id, _]) => id);
    
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      memoizedT('deleteSelectedSessions', { ns: 'profile', defaultValue: 'Elimina Sessioni Selezionate' }),
      memoizedT('deleteSelectedSessionsConfirmation', { ns: 'profile', defaultValue: `Sei sicuro di voler eliminare ${selectedIds.length} sessioni selezionate?` }),
      [
        {
          text: memoizedT('cancel', { ns: 'common' }),
          style: 'cancel'
        },
        {
          text: memoizedT('delete', { ns: 'common' }),
          style: 'destructive',
          onPress: () => {
            // Elimina tutte le sessioni selezionate
            selectedIds.forEach(id => {
              sessionService.deleteSession(id);
            });
            
            // Ricarica le sessioni e reimposta lo stato
            loadSessions();
          }
        }
      ]
    );
  }, [memoizedT, selectedSessions, loadSessions]);

  // Function to handle export data
  const handleExportData = useCallback(() => {
    // Verifica se l'utente ha accesso alle funzionalità premium
    if (!isPremium && !canExportData(true)) {
      return; // Il prompt di upgrade viene mostrato dal hook
    }
    
    if (sessions.length === 0) {
      Alert.alert(
        memoizedT('exportError', { ns: 'common' }),
        memoizedT('noDataToExport', { ns: 'common' })
      );
      return;
    }

    Alert.alert(
      memoizedT('exportSessions', { ns: 'session' }),
      memoizedT('chooseFormat', { ns: 'common' }),
      [
        {
          text: 'CSV',
          onPress: async () => {
            const success = await exportSessions(sessions, ExportFormat.CSV);
            if (success) {
              Alert.alert(
                memoizedT('exportSuccess', { ns: 'common' }),
                memoizedT('exportedSuccessfully', { ns: 'common' })
              );
            }
          }
        },
        {
          text: 'JSON',
          onPress: async () => {
            const success = await exportSessions(sessions, ExportFormat.JSON);
            if (success) {
              Alert.alert(
                memoizedT('exportSuccess', { ns: 'common' }),
                memoizedT('exportedSuccessfully', { ns: 'common' })
              );
            }
          }
        },
        {
          text: memoizedT('cancel', { ns: 'common' }),
          style: 'cancel'
        }
      ]
    );
  }, [memoizedT, sessions, isPremium, canExportData]);

  // Create a stable keyExtractor function
  const generateSessionKey = useCallback((item: Session) => {
    return `session-${item.id || 'unknown'}-${Date.now()}`;
  }, []);

  // Simple export function
  const exportSessions = async (data: Session[], format: ExportFormat): Promise<boolean> => {
    try {
      let content = '';
      const fileName = `alcoltest_sessions_${new Date().toISOString().split('T')[0]}.${format}`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      if (format === ExportFormat.JSON) {
        content = JSON.stringify(data, null, 2);
      } else {
        // Simple CSV conversion
        const headers = 'id,startTime,sessionStartTime,status,currentBAC\n';
        const rows = data.map(session => 
          `${session.id},${session.startTime},${session.sessionStartTime},${session.status},${session.currentBAC}`
        ).join('\n');
        content = headers + rows;
      }
      
      await FileSystem.writeAsStringAsync(filePath, content);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        memoizedT('exportError', { ns: 'common' }),
        memoizedT('errorExporting', { ns: 'common' })
      );
      return false;
    }
  };
  
  // Implementazione semplificata e più robusta della formattazione delle date
  const formatSessionDate = (dateValue: any): string => {
    try {
      // Se il valore è nullo o indefinito, ritorna un valore di default
      if (!dateValue) return 'Data non disponibile';
      
      // Converti in data se è una stringa
      let date: Date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return 'Formato data non valido';
      }
      
      // Verifica che la data sia valida
      if (isNaN(date.getTime())) {
        return 'Data non valida';
      }
      
      // Formattazione semplice e affidabile
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      return 'Errore data';
    }
  };
  
  // Calculate session duration with safety check
  const calculateDuration = (session: Session) => {
    try {
      if (!session || !session.startTime) return "N/A";
      
      // Se la sessione ha un endTime, calcoliamo la durata tra start e end
      // altrimenti, assumiamo che la sessione non sia ancora terminata
      let startTime = new Date(session.startTime);
      let endTime: Date;
      
      if (session.endTime) {
        endTime = new Date(session.endTime);
      } else if (session.isClosed) {
        // Se la sessione è chiusa ma non ha endTime esplicito, usiamo updated_at
        endTime = session.updated_at ? new Date(session.updated_at) : new Date();
      } else {
        // Sessione non terminata o dati mancanti
    return session.sessionDuration || "N/A";
      }
      
      // Calcola la durata in millisecondi
      const durationMs = endTime.getTime() - startTime.getTime();
      
      // Converti in ore e minuti
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Formatta in ore e minuti (es. 2h 34m)
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    } catch (error) {
      console.warn('Errore nel calcolo della durata:', error);
      return session.sessionDuration || "N/A";
    }
  };
  
  // Render a session card with comprehensive error checking
  const renderSessionItem = useCallback(({ item, index }: { item: Session, index: number }) => {
    try {
      // Validazione completa della sessione
      if (!item || typeof item !== 'object') {
        console.warn('Sessione invalida nel rendering:', item);
        return null;
      }

      // Validazione dei campi obbligatori
      if (!item.id || !item.startTime || !item.profile) {
        console.warn('Sessione mancante di campi obbligatori:', item);
        return null;
      }

      // Validazione del profilo
      if (!item.profile.id || !item.profile.name) {
        console.warn('Profilo invalido nella sessione:', item.profile);
        return null;
      }

      // Validazione degli array
      if (!Array.isArray(item.drinks)) {
        console.warn('Array drinks non valido nella sessione:', item);
        return null;
      }

      // Formattazione sicura delle date
      const sessionDate = formatSessionDate(item.startTime);
      const profileName = item.profile.name;

      // Calcolo sicuro del BAC
      let bacValue = '0.00';
      try {
        const bac = typeof item.currentBAC === 'number' ? item.currentBAC : 0;
        bacValue = bac.toFixed(2);
      } catch (e) {
        console.warn('Errore nel calcolo BAC:', e);
      }

      // Calcolo sicuro della durata
      let sessionDuration = 'N/A';
      try {
        sessionDuration = calculateDuration(item);
      } catch (e) {
        console.warn('Errore nel calcolo della durata:', e);
      }

      // Calcolo sicuro del numero di bevande
      let drinksCount = '0';
      try {
        drinksCount = item.drinks.length.toString();
      } catch (e) {
        console.warn('Errore nel calcolo del numero di bevande:', e);
      }

      const isSelected = !!selectedSessions[item.id];

      return (
        <TouchableOpacity
          style={[
            styles.sessionCard,
            { 
              backgroundColor: colors.cardBackground,
              borderColor: isSelected ? colors.primary : 'transparent',
              borderWidth: isSelected ? 2 : 0
            }
          ]}
          onPress={() => {
            if (isSelectionMode) {
              toggleSessionSelection(item.id);
            } else {
              try {
                // Naviga alla pagina di dettaglio della sessione storica anziché alla sessione attiva
                router.push({
                  pathname: '/history/session-details',
                  params: { id: item.id }
                });
              } catch (navError) {
                console.error('Errore nella navigazione:', navError);
                Alert.alert('Errore', 'Impossibile visualizzare i dettagli della sessione');
              }
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) {
              setIsSelectionMode(true);
              toggleSessionSelection(item.id);
            }
          }}
        >
          <View style={styles.sessionCardContent}>
            {isSelectionMode ? (
              <View style={styles.checkboxContainer}>
                <Ionicons 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelected ? colors.primary : colors.textSecondary} 
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation(); // Previene che il touch dell'eliminazione attivi anche il tocco della card
                  handleDeleteSession(item.id);
                }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            )}

            <View style={styles.cardHeader}>
              <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                {sessionDate}
              </Text>
              <Text style={[styles.sessionName, { color: colors.text }]}>
                {profileName}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {memoizedT('maxBAC')}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {bacValue} g/L
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {memoizedT('duration')}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {sessionDuration}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {memoizedT('drinks')}
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {drinksCount}
                </Text>
              </View>
            </View>

            {!isSelectionMode && (
              <View style={styles.viewDetails}>
                <Ionicons 
                  name="chevron-forward" 
                  size={18} 
                  color={colors.primary} 
                  style={styles.detailsIcon}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Errore nel rendering della sessione:', error);
      return null;
    }
  }, [colors, memoizedT, handleDeleteSession, formatSessionDate, calculateDuration, router, isSelectionMode, selectedSessions, toggleSessionSelection]);
  
  // Calcola il numero di sessioni selezionate
  const selectedCount = Object.values(selectedSessions).filter(Boolean).length;
  
  // Renderizza il contenuto della schermata
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          {/* Placeholder di caricamento */}
          <Ionicons name="time" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {memoizedT('loading', { ns: 'common' })}...
          </Text>
        </View>
      );
    }
    
    if (sessions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar" size={60} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {memoizedT('noSessionsFound')}
          </Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={sessions}
        keyExtractor={generateSessionKey}
        renderItem={renderSessionItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };
  
  // Rendering
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <AppHeader 
        title={memoizedT('sessionHistory')}
        isMainScreen={true}
        rightComponent={
          isSelectionMode ? (
            <View style={styles.selectionControls}>
              <TouchableOpacity 
                style={styles.selectAllButton}
                onPress={toggleSelectAll}
              >
                <Ionicons name="list" size={22} color={colors.text} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={toggleSelectionMode}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerControls}>
              <TouchableOpacity 
                style={styles.selectButton}
                onPress={toggleSelectionMode}
              >
                <Ionicons name="checkbox-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exportButton}
                onPress={handleExportData}
              >
                <Ionicons name="share-outline" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          )
        }
      />
      
      {isSelectionMode && selectedCount > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.selectionText, { color: colors.text }]}>
            {selectedCount} {selectedCount === 1 ? 'sessione selezionata' : 'sessioni selezionate'}
          </Text>
          <TouchableOpacity 
            style={[styles.deleteSelectedButton, { backgroundColor: colors.error }]}
            onPress={deleteSelectedSessions}
          >
            <Text style={styles.deleteSelectedText}>
              {memoizedT('delete', { ns: 'common' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Visualizzazione per utenti non premium che vogliono esportare dati */}
      {!isPremium && sessions.length > 0 && (
        <View style={styles.premiumFeatureContainer}>
          <PremiumFeatureBlock
            featureName={memoizedT('export', { ns: 'purchases' })}
            icon="download-outline"
            message={memoizedT('featureNeedsPremium', { 
              ns: 'purchases', 
              feature: memoizedT('dataExport', { ns: 'purchases' }) 
            })}
          />
        </View>
      )}
      
      {/* Contenuto principale */}
      {renderContent()}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: SIZES.subtitle,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
  },
  exportButton: {
    padding: 8,
    marginLeft: 8,
  },
  selectButton: {
    padding: 8,
    marginRight: 8,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    padding: 8,
    marginRight: 8,
  },
  cancelButton: {
    padding: 8,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectionText: {
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  deleteSelectedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSmall,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: SIZES.body,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -200,
  },
  emptyText: {
    fontSize: SIZES.subtitle,
    textAlign: 'center',
    marginTop: 16,
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    padding: 16,
    paddingBottom: 200,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sessionCardContent: {
    flex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 8,
  },
  cardHeader: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  sessionName: {
    fontSize: SIZES.body,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: SIZES.small,
    marginBottom: 4,
  },
  statValue: {
    fontSize: SIZES.body,
    fontWeight: 'bold',
  },
  viewDetails: {
    alignItems: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 8,
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  detailsIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumFeatureContainer: {
    padding: 16,
  },
}); 