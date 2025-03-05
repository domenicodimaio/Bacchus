import React, { useEffect, useRef } from 'react';
import { Redirect, router } from 'expo-router';
import sessionService from '../lib/services/session.service';

export default function SessionTab() {
  // Use a ref to track if we've already redirected
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Skip if we've already redirected
    if (hasRedirectedRef.current) return;

    // Check if there's an active session
    const activeSession = sessionService.getActiveSession();
    
    if (!activeSession) {
      // If there's no active session, redirect to the dashboard to create a new session
      hasRedirectedRef.current = true;
      router.push('/dashboard');
    } else {
      // Mark that we've handled the redirect logic
      hasRedirectedRef.current = true;
    }
  }, []);

  // This tab redirects to the active session if available
  return <Redirect href="/session" />;
} 