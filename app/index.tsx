import React from 'react';
import { Redirect } from 'expo-router';

export default function IndexPage() {
  // Utilizziamo il componente Redirect fornito da expo-router
  // che è progettato per funzionare anche durante il montaggio iniziale
  return <Redirect href="/auth/login" />;
} 