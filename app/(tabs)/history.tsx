import React, { useRef } from 'react';
import { Redirect } from 'expo-router';

export default function HistoryTab() {
  // Use a ref to track if we've already redirected
  const hasRedirectedRef = useRef(false);

  // This tab redirects to the session history screen
  return <Redirect href="/history" />;
} 