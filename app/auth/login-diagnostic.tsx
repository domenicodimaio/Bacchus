import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import supabase, { 
  supabaseUrl, 
  supabaseAnonKey, 
  createTempClient, 
  validateSupabaseConnection,
  clearStoredAuthSessions
} from '../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function LoginDiagnostic() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');

  useEffect(() => {
    // Test connection to Supabase on mount
    testConnection();
  }, []);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  const testConnection = async () => {
    log('Testing connection to Supabase...');
    setConnectionStatus('unknown');
    
    try {
      const isValid = await validateSupabaseConnection();
      setConnectionStatus(isValid ? 'valid' : 'invalid');
      log(`Connection test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      // If connection is invalid, provide more diagnostics
      if (!isValid) {
        log('⚠️ API key may be invalid or server unreachable');
        log(`URL: ${supabaseUrl}`);
        log('Trying API key validation...');
        
        try {
          // Test API key with a direct fetch to validate
          const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'invalid-password-just-testing-api'
            })
          });
          
          if (response.status === 400) {
            // If we get a 400 response, that's actually good - it means the API key is valid
            // but the credentials are wrong (expected)
            log('✅ API key appears valid (got expected 400 error)');
            setConnectionStatus('valid');
          } else if (response.status === 401 || response.status === 403) {
            log('❌ API key is invalid (unauthorized)');
          } else {
            log(`⚠️ Unusual response status: ${response.status}`);
          }
        } catch (fetchError: any) {
          log(`❌ Network error: ${fetchError.message}`);
        }
      }
    } catch (error: any) {
      log(`❌ Error during connection test: ${error.message}`);
      setConnectionStatus('invalid');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setLogs([]);
    
    try {
      log(`Starting login with email: ${email}`);
      
      // Clear previous auth tokens
      log('Clearing previous auth tokens...');
      await clearStoredAuthSessions();
      
      // Create a fresh client for this test
      log('Creating fresh client for auth test...');
      const freshClient = createTempClient();
      
      // Try authentication
      log('Attempting authentication...');
      const { data, error } = await freshClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        log(`❌ Authentication failed: ${error.message}`);
        
        // Additional diagnostics for specific errors
        if (error.message.includes('Invalid login credentials')) {
          log('⚠️ This suggests your email/password combination is incorrect');
        } else if (error.message.includes('API key')) {
          log('⚠️ This suggests an issue with the Supabase API key');
          log('Retrying connection test...');
          await testConnection();
        }
        
        return;
      }
      
      log('✅ Authentication successful');
      log(`User ID: ${data.user.id}`);
      log(`Email: ${data.user.email}`);
      if (data.session) {
        log(`Session expires: ${new Date(data.session.expires_at * 1000).toLocaleString()}`);
      }
      
      // Test database access with the authenticated session
      log('Testing database access with authenticated session...');
      try {
        // Try to get user's profile
        const { data: profileData, error: profileError } = await freshClient
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();
        
        if (profileError) {
          log(`❌ Profile retrieval failed: ${profileError.message}`);
          
          // Try a simpler database access test
          log('Testing basic database access...');
          const { data: countData, error: countError } = await freshClient
            .from('profiles')
            .select('count', { count: 'exact', head: true });
          
          if (countError) {
            log(`❌ Database access test failed: ${countError.message}`);
            log(`⚠️ This suggests an issue with database permissions`);
          } else {
            log(`✅ Database access test successful, but specific profile retrieval failed`);
            log(`⚠️ This suggests Row Level Security (RLS) policies might be restricting access`);
          }
        } else {
          log(`✅ Profile retrieval successful`);
          if (profileData) {
            log(`Profile ID: ${profileData.id}`);
            log(`Profile name: ${profileData.name || 'Not set'}`);
          } else {
            log(`⚠️ No profile found for user ID: ${data.user.id}`);
            log(`You may need to create a profile for this user`);
          }
        }
      } catch (dbError: any) {
        log(`❌ Unexpected error during database access: ${dbError.message}`);
      }
      
      log(`\n✅ Login diagnosis complete.`);
      
      // Sign out
      log('Signing out...');
      await freshClient.auth.signOut();
      
    } catch (error: any) {
      log(`❌ Unexpected error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Login Diagnostic</Text>
      
      <View style={styles.statusContainer}>
        <Text>Connection Status: </Text>
        {connectionStatus === 'unknown' && <ActivityIndicator size="small" />}
        {connectionStatus === 'valid' && <Text style={styles.validText}>✅ Valid</Text>}
        {connectionStatus === 'invalid' && <Text style={styles.invalidText}>❌ Invalid</Text>}
        
        <Button
          title="Test Connection"
          onPress={testConnection}
          disabled={isLoading}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button
          title={isLoading ? "Loading..." : "Test Login"}
          onPress={handleLogin}
          disabled={isLoading}
        />
        
        <Button
          title="Back to Diagnostic"
          onPress={() => router.replace('/')}
          color="#888"
        />
      </View>
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  validText: {
    color: 'green',
    fontWeight: 'bold',
  },
  invalidText: {
    color: 'red',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
  },
  logText: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
}); 