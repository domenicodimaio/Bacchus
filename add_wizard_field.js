require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Legge le variabili d'ambiente necessarie
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL e SUPABASE_ANON_KEY devono essere definiti nel file .env');
  process.exit(1);
}

async function executeSql() {
  try {
    // Legge il file SQL
    const sqlFilePath = path.join(__dirname, 'supabase/add_has_completed_wizard.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Esecuzione delle query SQL...');
    
    // Esegue la query SQL utilizzando direttamente l'endpoint SQL di Supabase
    const response = await axios({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      data: {
        query: sqlQuery
      }
    });
    
    console.log('Migrazione completata con successo:', response.data);
    return true;
  } catch (error) {
    console.error('Errore durante l\'esecuzione della migrazione:', error.response ? error.response.data : error.message);
    return false;
  }
}

// Esegue la migrazione
executeSql(); 