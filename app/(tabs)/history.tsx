import React from 'react';

// 🔧 FIX CRITICO: Import history direttamente invece di redirect
import HistoryScreen from '../history/index';

export default function HistoryTab() {
  // 🔧 FIX: Render history direttamente - NO PIU' REDIRECT!
  return <HistoryScreen />;
} 