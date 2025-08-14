/**
 * Test per Storage Service centralizzato
 * 
 * Previene regressioni dopo la centralizzazione di AsyncStorage
 */

/// <reference types="jest" />

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService, STORAGE_KEYS } from '../storage.service';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockedAsyncStorage = mockAsyncStorage;

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Operations', () => {
    it('should get a value from storage', async () => {
      const testValue = { test: 'data' };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testValue));

      const result = await storageService.get('test-key');

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testValue);
    });

    it('should return null for non-existent key', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await storageService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should set a value in storage', async () => {
      const testValue = { test: 'data' };

      await storageService.set('test-key', testValue);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-key', 
        JSON.stringify(testValue)
      );
    });

    it('should remove a value from storage', async () => {
      await storageService.remove('test-key');

      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should remove multiple values', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await storageService.removeMultiple(keys);

      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith(keys);
    });
  });

  describe('Standardized Keys', () => {
    it('should have consistent key prefixes', () => {
      // Tutti i keys dovrebbero iniziare con 'bacchus_'
      Object.values(STORAGE_KEYS).forEach(key => {
        expect(key).toMatch(/^bacchus_/);
      });
    });

    it('should have all required keys defined', () => {
      const requiredKeys = [
        'USER_DATA',
        'USER_SESSION', 
        'PROFILES',
        'ACTIVE_PROFILE',
        'WIZARD_COMPLETED',
        'SIMULATE_PREMIUM'
      ];

      requiredKeys.forEach(key => {
        expect(STORAGE_KEYS).toHaveProperty(key);
      });
    });
  });

  describe('Domain Helpers', () => {
    it('should get user data', async () => {
      const userData = { id: '123', email: 'test@test.com' };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(userData));

      const result = await storageService.getUserData();

      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA);
      expect(result).toEqual(userData);
    });

    it('should set user data', async () => {
      const userData = { id: '123', email: 'test@test.com' };

      await storageService.setUserData(userData);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );
    });

    it('should get profiles with default empty array', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await storageService.getProfiles();

      expect(result).toEqual([]);
    });

    it('should check wizard completion', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue('true');

      const result = await storageService.isWizardCompleted();

      expect(result).toBe(true);
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.WIZARD_COMPLETED);
    });

    it('should check premium simulation', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue('true');

      const result = await storageService.isPremiumSimulated();

      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await storageService.get('test-key');

      expect(result).toBeNull();
    });

    it('should return false on set error', async () => {
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const result = await storageService.set('test-key', 'test-value');

      expect(result).toBe(false);
    });

    it('should return false on remove error', async () => {
      mockedAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      const result = await storageService.remove('test-key');

      expect(result).toBe(false);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clear user data with correct keys', async () => {
      await storageService.clearUserData();

      const expectedKeys = [
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_SESSION,
        STORAGE_KEYS.SUPABASE_AUTH_TOKEN,
        STORAGE_KEYS.ACTIVE_PROFILE,
        STORAGE_KEYS.CURRENT_PROFILE,
        STORAGE_KEYS.ACTIVE_SESSIONS,
        STORAGE_KEYS.LAST_KNOWN_SESSION,
      ];

      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith(expectedKeys);
    });

    it('should clear app data but keep language and theme', async () => {
      const allKeys = [
        'bacchus_user_data',
        'bacchus_profiles', 
        'bacchus_language',  // Dovrebbe essere mantenuto
        'bacchus_theme',     // Dovrebbe essere mantenuto
        'other_app_data'     // Non bacchus, dovrebbe essere ignorato
      ];
      
      mockedAsyncStorage.getAllKeys.mockResolvedValue(allKeys);

      await storageService.clearAllAppData();

      const expectedKeysToRemove = [
        'bacchus_user_data',
        'bacchus_profiles'
      ];

      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith(expectedKeysToRemove);
    });
  });

  describe('Multiple Operations', () => {
    it('should get multiple values', async () => {
      const keyValuePairs = [
        ['key1', '{"value": 1}'],
        ['key2', '{"value": 2}'],
        ['key3', null]
      ];
      
      mockedAsyncStorage.multiGet.mockResolvedValue(keyValuePairs);

      const result = await storageService.getMultiple(['key1', 'key2', 'key3']);

      expect(result).toEqual({
        key1: { value: 1 },
        key2: { value: 2 }
      });
    });

    it('should set multiple values', async () => {
      const data = {
        key1: { value: 1 },
        key2: 'string-value'
      };

      await storageService.setMultiple(data);

      const expectedPairs = [
        ['key1', '{"value":1}'],
        ['key2', 'string-value']
      ];

      expect(mockedAsyncStorage.multiSet).toHaveBeenCalledWith(expectedPairs);
    });
  });
}); 