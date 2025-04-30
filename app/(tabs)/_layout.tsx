import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSession } from '../contexts/SessionContext';

export default function TabLayout() {
  const { currentTheme } = useTheme();
  const { t, i18n } = useTranslation(['common', 'dashboard', 'session', 'profile']);
  const { currentSession } = useSession();
  const colors = currentTheme.COLORS;

  // Memoize the tab options to prevent re-renders
  const tabOptions = useMemo(() => {
    return {
      dashboard: {
        title: t('dashboard', { ns: 'dashboard' }),
        tabBarLabel: t('dashboard', { ns: 'dashboard' }),
        tabBarIcon: ({ color, size }: { color: string, size: number }) => (
          <Ionicons name="home-outline" size={size} color={color} />
        ),
      },
      session: {
        title: t('activeSession', { ns: 'session' }),
        tabBarLabel: t('session', { ns: 'session' }),
        tabBarIcon: ({ color, size }: { color: string, size: number }) => (
          <Ionicons name="wine-outline" size={size} color={color} />
        ),
      },
      history: {
        title: t('sessionHistory', { ns: 'session' }),
        tabBarLabel: t('history', { ns: 'dashboard' }),
        tabBarIcon: ({ color, size }: { color: string, size: number }) => (
          <Ionicons name="time-outline" size={size} color={color} />
        ),
      },
      profile: {
        title: t('profile', { ns: 'profile' }),
        tabBarLabel: t('profile', { ns: 'profile' }),
        tabBarIcon: ({ color, size }: { color: string, size: number }) => (
          <Ionicons name="person-outline" size={size} color={color} />
        ),
      }
    };
  }, [t, i18n.language]); // Re-compute when the translation function or language changes

  // Memoize the screen options to prevent re-renders
  const screenOptions = useMemo(() => {
    return {
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: colors.cardBackground,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      tabBarShowLabel: true,
      headerShown: false,
    };
  }, [colors]); // Only re-compute when colors change

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="dashboard"
        options={tabOptions.dashboard}
      />
      <Tabs.Screen
        name="session"
        options={tabOptions.session}
      />
      <Tabs.Screen
        name="history"
        options={tabOptions.history}
      />
      <Tabs.Screen
        name="profile"
        options={tabOptions.profile}
      />
    </Tabs>
  );
} 