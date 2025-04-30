const axios = require('axios');
require('dotenv').config();

// Verifica che le variabili d'ambiente necessarie siano definite
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Errore: SUPABASE_URL e SUPABASE_KEY (SUPABASE_SERVICE_KEY o SUPABASE_ANON_KEY) devono essere definite nelle variabili d\'ambiente');
  process.exit(1);
}

// Funzione per verificare se la colonna esiste già
async function checkColumnExists() {
  try {
    console.log('Verifico se la colonna has_completed_wizard esiste già...');
    
    const response = await axios({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/profiles?select=has_completed_wizard&limit=1`,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    // Se non otteniamo un errore, la colonna esiste
    console.log('La colonna has_completed_wizard esiste già.');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400 && 
        error.response.data && error.response.data.message && 
        error.response.data.message.includes('has_completed_wizard')) {
      console.log('La colonna has_completed_wizard non esiste ancora.');
      return false;
    }
    
    // Se è un altro tipo di errore, lo propaghiamo
    console.error('Errore durante la verifica della colonna:', error.response?.data || error.message);
    throw error;
  }
}

// Funzione per aggiungere la colonna utilizzando l'API di Supabase
async function addColumn() {
  try {
    // Prima verifichiamo se la colonna esiste già
    const columnExists = await checkColumnExists();
    
    if (columnExists) {
      console.log('La colonna esiste già, non è necessario aggiungerla.');
      return;
    }
    
    console.log('Aggiungo la colonna has_completed_wizard alla tabella profiles...');
    
    // Otteniamo tutti i profili esistenti
    const { data: profiles } = await axios({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/profiles?select=id,user_id,name,gender,weightKg,age,height,drinkingFrequency,emoji,color,is_default`,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    console.log(`Trovati ${profiles ? profiles.length : 0} profili.`);
    
    if (profiles && profiles.length > 0) {
      // Aggiorniamo il primo profilo con il nuovo campo
      const profileId = profiles[0].id;
      
      await axios({
        method: 'PATCH',
        url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        data: {
          has_completed_wizard: false
        }
      });
      
      console.log(`Colonna has_completed_wizard aggiunta con successo al profilo ${profileId}!`);
    } else {
      // Se non ci sono profili, ne creiamo uno temporaneo
      console.log('Nessun profilo trovato. Creo un profilo temporaneo per aggiungere la colonna...');
      
      const tempProfile = {
        id: 'temp-profile-' + Date.now(),
        name: 'Temporary Profile',
        gender: 'male',
        weightKg: 70,
        age: 30,
        height: 175,
        drinkingFrequency: 'occasionally',
        emoji: '🧪',
        color: '#FF5252',
        is_default: false,
        has_completed_wizard: false
      };
      
      await axios({
        method: 'POST',
        url: `${SUPABASE_URL}/rest/v1/profiles`,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        data: tempProfile
      });
      
      console.log('Profilo temporaneo creato con successo. Colonna has_completed_wizard aggiunta!');
      
      // Eliminiamo il profilo temporaneo
      await axios({
        method: 'DELETE',
        url: `${SUPABASE_URL}/rest/v1/profiles?id=eq.${tempProfile.id}`,
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      console.log('Profilo temporaneo eliminato.');
    }
    
    // Verifichiamo che la colonna sia stata aggiunta
    const columnAdded = await checkColumnExists();
    if (columnAdded) {
      console.log('Verifica completata: la colonna has_completed_wizard è stata aggiunta con successo!');
    } else {
      console.error('Errore: la colonna has_completed_wizard non è stata aggiunta correttamente.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Errore durante l\'aggiunta della colonna:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Esegui la migrazione
addColumn(); 