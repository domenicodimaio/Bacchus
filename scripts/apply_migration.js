// Script per applicare la migrazione al database Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurazione Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Inizializza il client Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Percorso del file di migrazione
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240702_fix_sessions_structure.sql');

// Funzione principale
async function applyMigration() {
  try {
    console.log('Lettura del file di migrazione...');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Contenuto della migrazione:');
    console.log(migrationSql);
    
    console.log('\nApplicazione della migrazione al database...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSql
    });
    
    if (error) {
      console.error('Errore durante l\'applicazione della migrazione:', error);
      process.exit(1);
    }
    
    console.log('Migrazione applicata con successo!');
    console.log('Risultato:', data);
    
  } catch (err) {
    console.error('Errore durante l\'esecuzione dello script:', err);
    process.exit(1);
  }
}

// Esegui la funzione principale
applyMigration(); 