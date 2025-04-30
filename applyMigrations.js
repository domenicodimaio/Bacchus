require('dotenv').config();
const axios = require('axios');

// Legge le variabili d'ambiente necessarie
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL e SUPABASE_ANON_KEY devono essere definiti nel file .env');
  process.exit(1);
}

async function executeQuery(query) {
  try {
    console.log(`Esecuzione query: ${query.substring(0, 50)}...`);
    
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/execute_sql`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    console.log('Query eseguita con successo:', response.data);
    return true;
  } catch (error) {
    console.error('Errore durante la chiamata API:', error.response ? error.response.data : error.message);
    return false;
  }
}

// Le migrazioni da eseguire
const migrations = [
  // Creazione tabella active_sessions
  `CREATE TABLE IF NOT EXISTS "public"."active_sessions" (
    "id" TEXT PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "session_data" JSONB NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Creazione tabella session_history
  `CREATE TABLE IF NOT EXISTS "public"."session_history" (
    "id" TEXT PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "session_data" JSONB NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,

  // Indici
  `CREATE INDEX IF NOT EXISTS active_sessions_user_id_idx ON "public"."active_sessions"(user_id)`,
  `CREATE INDEX IF NOT EXISTS active_sessions_profile_id_idx ON "public"."active_sessions"(profile_id)`,
  `CREATE INDEX IF NOT EXISTS session_history_user_id_idx ON "public"."session_history"(user_id)`,
  `CREATE INDEX IF NOT EXISTS session_history_profile_id_idx ON "public"."session_history"(profile_id)`,

  // Funzione trigger
  `CREATE OR REPLACE FUNCTION update_session_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  // Trigger per active_sessions
  `CREATE TRIGGER update_active_sessions_updated_at
  BEFORE UPDATE ON "public"."active_sessions"
  FOR EACH ROW
  EXECUTE FUNCTION update_session_updated_at_column()`,

  // Trigger per session_history
  `CREATE TRIGGER update_session_history_updated_at
  BEFORE UPDATE ON "public"."session_history"
  FOR EACH ROW
  EXECUTE FUNCTION update_session_updated_at_column()`,

  // RLS
  `ALTER TABLE "public"."active_sessions" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "public"."session_history" ENABLE ROW LEVEL SECURITY`,

  // Politiche RLS per active_sessions
  `CREATE POLICY "Users can view their own active sessions" 
  ON "public"."active_sessions" FOR SELECT 
  USING (auth.uid() = user_id)`,

  `CREATE POLICY "Users can create their own active sessions" 
  ON "public"."active_sessions" FOR INSERT 
  WITH CHECK (auth.uid() = user_id)`,

  `CREATE POLICY "Users can update their own active sessions" 
  ON "public"."active_sessions" FOR UPDATE 
  USING (auth.uid() = user_id)`,

  `CREATE POLICY "Users can delete their own active sessions" 
  ON "public"."active_sessions" FOR DELETE 
  USING (auth.uid() = user_id)`,

  // Politiche RLS per session_history
  `CREATE POLICY "Users can view their own session history" 
  ON "public"."session_history" FOR SELECT 
  USING (auth.uid() = user_id)`,

  `CREATE POLICY "Users can create their own session history" 
  ON "public"."session_history" FOR INSERT 
  WITH CHECK (auth.uid() = user_id)`,

  `CREATE POLICY "Users can update their own session history" 
  ON "public"."session_history" FOR UPDATE 
  USING (auth.uid() = user_id)`,

  `CREATE POLICY "Users can delete their own session history" 
  ON "public"."session_history" FOR DELETE 
  USING (auth.uid() = user_id)`
];

async function runMigrations() {
  console.log('Inizio esecuzione migrazioni...');

  for (let i = 0; i < migrations.length; i++) {
    console.log(`Esecuzione migrazione ${i + 1}/${migrations.length}...`);
    const success = await executeQuery(migrations[i]);
    
    if (!success) {
      console.error(`Migrazione ${i + 1} fallita.`);
      // Continua con le altre migrazioni anche in caso di errore
    }
  }

  console.log('Migrazioni completate.');
}

runMigrations(); 