import React, { useEffect } from 'react';
import { useRouter, Slot } from 'expo-router';
import sessionService from '../lib/services/session.service';

/**
 * Questo componente è un layout che gestisce la navigazione alla sessione.
 * Se esiste una sessione attiva, renderizza il contenuto della sessione.
 * Altrimenti reindirizza alla dashboard.
 */
export default function SessionLayout() {
  const router = useRouter();

  useEffect(() => {
    // Verifica se esiste una sessione attiva
    const activeSession = sessionService.getActiveSession();
    
    if (!activeSession) {
      // Redirige alla dashboard se non c'è sessione attiva
      router.replace('/dashboard');
    }
  }, [router]);
    
  // Renderizza direttamente il contenuto della tab senza reindirizzamenti visibili
  return <Slot />;
} 