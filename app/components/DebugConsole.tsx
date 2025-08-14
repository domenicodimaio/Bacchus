import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  args?: any[];
}

export default function DebugConsole() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { currentTheme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const originalConsole = useRef({
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  });

  useEffect(() => {
    // Intercetta i log della console
    const interceptConsole = (level: keyof typeof originalConsole.current) => {
      const original = originalConsole.current[level];
      (console as any)[level] = (...args: any[]) => {
        // Chiama la console originale
        original.apply(console, args);
        
        // Aggiungi al nostro log
        const logEntry: LogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          level: level as any,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '),
          args,
        };
        
        setLogs(prev => [...prev.slice(-99), logEntry]); // Mantieni solo ultimi 100 log
      };
    };

    // Intercetta tutti i tipi di log
    interceptConsole('log');
    interceptConsole('warn');
    interceptConsole('error');
    interceptConsole('info');

    // Cleanup
    return () => {
      console.log = originalConsole.current.log;
      console.warn = originalConsole.current.warn;
      console.error = originalConsole.current.error;
      console.info = originalConsole.current.info;
    };
  }, []);

  useEffect(() => {
    // Auto-scroll al nuovo log
    if (scrollViewRef.current && logs.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const shareLogs = async () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    try {
      await Share.share({
        message: `Bacchus App Debug Logs\n\n${logText}`,
        title: 'Debug Logs',
      });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile condividere i log');
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '#ff4444';
      case 'warn': return '#ffaa00';
      case 'info': return '#00aaff';
      default: return currentTheme.COLORS.text;
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'alert-circle';
      case 'warn': return 'warning';
      case 'info': return 'information-circle';
      default: return 'chatbubble-ellipses';
    }
  };

  // Floating button per aprire/chiudere la console
  const FloatingButton = () => (
    <TouchableOpacity
      style={[styles.floatingButton, { backgroundColor: currentTheme.COLORS.primary }]}
      onPress={() => setIsVisible(!isVisible)}
    >
      <Ionicons name="terminal" size={24} color="white" />
    </TouchableOpacity>
  );

  return (
    <>
      {__DEV__ && <FloatingButton />}
      
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.container, { backgroundColor: currentTheme.COLORS.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: currentTheme.COLORS.border }]}>
            <Text style={[styles.title, { color: currentTheme.COLORS.text }]}>
              Debug Console ({logs.length})
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={shareLogs} style={styles.headerButton}>
                <Ionicons name="share-outline" size={20} color={currentTheme.COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearLogs} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={20} color={currentTheme.COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.headerButton}>
                <Ionicons name="close" size={20} color={currentTheme.COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Logs */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.logsContainer}
            showsVerticalScrollIndicator={false}
          >
            {logs.map((log, index) => (
              <View key={index} style={[styles.logEntry, { borderBottomColor: currentTheme.COLORS.border }]}>
                <View style={styles.logHeader}>
                  <Ionicons 
                    name={getLogIcon(log.level) as any} 
                    size={14} 
                    color={getLogColor(log.level)} 
                  />
                  <Text style={[styles.logTimestamp, { color: currentTheme.COLORS.textSecondary }]}>
                    {log.timestamp}
                  </Text>
                  <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
                    {log.level.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.logMessage, { color: currentTheme.COLORS.text }]}>
                  {log.message}
                </Text>
              </View>
            ))}
            
            {logs.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="terminal" size={48} color={currentTheme.COLORS.textSecondary} />
                <Text style={[styles.emptyText, { color: currentTheme.COLORS.textSecondary }]}>
                  Nessun log disponibile
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 12,
    padding: 4,
  },
  logsContainer: {
    flex: 1,
    padding: 8,
  },
  logEntry: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 11,
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  logLevel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
}); 