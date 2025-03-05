import React, { useRef } from 'react';
import { Redirect } from 'expo-router';

export default function ProfileTab() {
  // Use a ref to track if we've already redirected
  const hasRedirectedRef = useRef(false);

  // This tab redirects to the profiles management screen
  return <Redirect href="/profiles" />;
} 