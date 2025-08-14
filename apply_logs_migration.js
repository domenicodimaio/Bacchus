const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://egdpjqdsugbcoroclgys.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Devi aggiungere questa chiave al .env

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyLogsMigration() {
  console.log('🚀 Applicando migrazione per tabella app_logs...');
  
  try {
    // Crea la tabella app_logs
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Crea la tabella per i log dell'applicazione
        CREATE TABLE IF NOT EXISTS app_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
          message TEXT NOT NULL,
          category TEXT,
          metadata JSONB,
          stack_trace TEXT,
          user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          device_info JSONB,
          app_version TEXT,
          timestamp TIMESTAMPTZ
        );

        -- Indici per performance
        CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
        CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);

        -- RLS policies
        ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

        -- Policy per permettere agli utenti di inserire i propri log
        DROP POLICY IF EXISTS "Users can insert their own logs" ON app_logs;
        CREATE POLICY "Users can insert their own logs" ON app_logs
          FOR INSERT WITH CHECK (
            auth.uid() = user_id OR user_id IS NULL
          );

        -- Policy per permettere agli utenti di leggere i propri log
        DROP POLICY IF EXISTS "Users can read their own logs" ON app_logs;
        CREATE POLICY "Users can read their own logs" ON app_logs
          FOR SELECT USING (
            auth.uid() = user_id
          );
      `
    });

    if (createTableError) {
      throw createTableError;
    }

    console.log('✅ Migrazione applicata con successo!');
    console.log('📊 Tabella app_logs creata e configurata');
    
    // Test inserimento log
    const { data: testLog, error: testError } = await supabase
      .from('app_logs')
      .insert({
        level: 'info',
        message: 'Test log migration successful',
        category: 'migration_test',
        metadata: { test: true },
        app_version: '1.2.2'
      })
      .select()
      .single();

    if (testError) {
      console.warn('⚠️ Test inserimento fallito:', testError.message);
    } else {
      console.log('✅ Test inserimento log riuscito:', testLog.id);
      
      // Elimina il log di test
      await supabase.from('app_logs').delete().eq('id', testLog.id);
    }

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
  }
}

// Esegui la migrazione se questo file viene chiamato direttamente
if (require.main === module) {
  applyLogsMigration().then(() => {
    console.log('🎉 Migrazione completata!');
    process.exit(0);
  });
}

module.exports = { applyLogsMigration }; 