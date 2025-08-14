import React from 'react';

// 🔧 FIX CRITICO: Import session direttamente invece di redirect logica complessa
import SessionScreen from '../session/index';

export default function SessionTab() {
  // 🔧 FIX: Render session direttamente - NO PIU' ROUTING COMPLESSO!
  return <SessionScreen />;
} 