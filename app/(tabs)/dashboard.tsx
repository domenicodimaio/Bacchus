import React, { useEffect, useRef } from 'react';
import { Redirect } from 'expo-router';
import * as profileService from '../lib/services/profile.service';

export default function DashboardTab() {
  // Use a ref to track if we've already redirected
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Verifica che l'utente abbia un profilo
    const profiles = profileService.getProfiles();
    if (profiles.length === 0 && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      // Se non ha un profilo, redirect al creatore di profilo
      return;
    }
  }, []);

  // This tab simply redirects to the main dashboard screen
  // ma senza passare per index.tsx che potrebbe causare un nuovo login
  return <Redirect href={"/dashboard/index" as any} />;
} 