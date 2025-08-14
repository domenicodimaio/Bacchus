/**
 * REGOLE STANDARD DI NAVIGAZIONE - BACCHUS APP
 * 
 * Questo file definisce i pattern standard per la navigazione
 * per eliminare inconsistenze e conflitti.
 */

import { router } from 'expo-router';

// ===== REGOLE STANDARDIZZATE =====

/**
 * RULE 1: STACK MANAGEMENT
 * 
 * - router.replace(): Usa SOLO per flussi di autenticazione e wizard
 * - router.push(): Usa per navigazione normale che permette back
 * - router.navigate(): Alias di push, preferisci push per chiarezza
 * - router.back(): Usa per tornare indietro nel stack
 */

/**
 * RULE 2: AUTHENTICATION FLOWS
 * 
 * - Logout → Login: sempre replace (cancella stack)
 * - Login → Dashboard/Wizard: sempre replace (non permettere back a login)
 * - Wizard → Dashboard: sempre replace (non permettere back a wizard incompleto)
 */

/**
 * RULE 3: NORMAL NAVIGATION
 * 
 * - Dashboard → Settings: push (permetti back)
 * - Dashboard → Profile: push (permetti back) 
 * - Settings → Subsettings: push (permetti back)
 * - Qualsiasi Modal/Popup: push (permetti dismiss)
 */

/**
 * RULE 4: GLOBAL FLAGS
 * 
 * - Usa SOLO nel NavigationHandler centralizzato
 * - NON usare negli auth services o componenti
 * - Pulisci sempre dopo uso
 */

// ===== NAVIGATION SERVICE =====

export class NavigationService {
  /**
   * AUTHENTICATION NAVIGATION (replace - cancella history)
   */
  static toLogin() {
    console.log('[NAV] → Login (replace)');
    router.replace('/auth/login');
  }

  static toSignup() {
    console.log('[NAV] → Signup (replace)');
    router.replace('/auth/signup');
  }

  static toDashboard() {
    console.log('[NAV] → Dashboard (replace)');
    router.replace('/(tabs)/dashboard');
  }

  static toWizard() {
    console.log('[NAV] → Wizard (replace)');
    router.replace('/onboarding/profile-wizard');
  }

  /**
   * NORMAL NAVIGATION (push - mantiene history)
   */
  static toSettings() {
    console.log('[NAV] → Settings (push)');
    router.push('/settings');
  }

  static toProfile() {
    console.log('[NAV] → Profile (push)');
    router.push('/profile');
  }

  static toSession() {
    console.log('[NAV] → Session (push)');
    router.push('/session');
  }

  static toHistory() {
    console.log('[NAV] → History (push)');
    router.push('/history');
  }

  static toPremium(source: string = 'unknown') {
    console.log(`[NAV] → Premium from ${source} (push)`);
    router.push({
      pathname: '/onboarding/subscription-offer',
      params: { source, ts: Date.now().toString() }
    });
  }

  /**
   * UTILITY NAVIGATION
   */
  static back() {
    console.log('[NAV] ← Back');
    router.back();
  }

  static dismiss() {
    console.log('[NAV] ← Dismiss');
    router.dismiss();
  }

  /**
   * SAFE NAVIGATION (con try/catch)
   */
  static safeNavigate(action: () => void, fallback?: () => void) {
    try {
      action();
    } catch (error) {
      console.error('[NAV] Navigation error:', error);
      if (fallback) {
        try {
          fallback();
        } catch (fallbackError) {
          console.error('[NAV] Fallback navigation error:', fallbackError);
          // Ultima spiaggia: vai alla dashboard
          this.toDashboard();
        }
      }
    }
  }
}

// ===== GLOBAL FLAGS MANAGEMENT =====

export class NavigationFlags {
  private static flags = new Set<string>();

  /**
   * Set a navigation flag
   */
  static set(flag: string) {
    this.flags.add(flag);
    console.log(`[NAV_FLAGS] Set: ${flag}`);
  }

  /**
   * Check if a flag is set
   */
  static has(flag: string): boolean {
    return this.flags.has(flag);
  }

  /**
   * Clear a specific flag
   */
  static clear(flag: string) {
    this.flags.delete(flag);
    console.log(`[NAV_FLAGS] Clear: ${flag}`);
  }

  /**
   * Clear all flags
   */
  static clearAll() {
    const count = this.flags.size;
    this.flags.clear();
    console.log(`[NAV_FLAGS] Cleared all ${count} flags`);
  }

  /**
   * List all active flags (for debugging)
   */
  static list(): string[] {
    return Array.from(this.flags);
  }
}

// ===== CONSTANTS =====

export const NAV_FLAGS = {
  WIZARD_AFTER_REGISTRATION: 'WIZARD_AFTER_REGISTRATION',
  BLOCK_ALL_SCREENS: 'BLOCK_ALL_SCREENS', 
  PREVENT_ALL_REDIRECTS: 'PREVENT_ALL_REDIRECTS',
  LOGIN_REDIRECT_IN_PROGRESS: 'LOGIN_REDIRECT_IN_PROGRESS',
  SHOWING_SUBSCRIPTION_SCREEN: 'SHOWING_SUBSCRIPTION_SCREEN'
} as const;

export const ROUTES = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  AUTH_CALLBACK: '/auth/auth-callback',
  
  // Main app
  DASHBOARD: '/dashboard',
  SESSION: '/session',
  HISTORY: '/history',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  
  // Onboarding
  WIZARD: '/onboarding/profile-wizard',
  PREMIUM: '/onboarding/subscription-offer',
  
  // Sub-pages
  SESSION_ADD_DRINK: '/session/add-drink',
  SESSION_ADD_FOOD: '/session/add-food',
  PROFILE_EDIT: '/profiles/edit',
  SETTINGS_OFFLINE: '/settings/offline'
} as const;

// ===== NAVIGATION HELPERS =====

/**
 * Check if current route matches a pattern
 * Note: These functions should be used with hooks in components
 */
export function isCurrentRoute(currentPath: string, pattern: string): boolean {
  return currentPath.startsWith(pattern);
}

/**
 * Get current route for debugging
 * Note: Use usePathname() hook in components to get currentPath
 */
export function getCurrentRoute(): string {
  // For utility logging - cannot access router state here
  return 'use-usePathname-hook';
}

// ===== EXPORT DEFAULT SERVICE =====

export default NavigationService; 