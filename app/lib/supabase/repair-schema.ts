import supabase from './client';

/**
 * Ripara lo schema del database verificando che la tabella e le colonne necessarie esistano
 * Versione semplificata che non usa SQL diretto ma tenta solo operazioni base
 */
export async function repairDatabaseSchema(): Promise<boolean> {
  try {
    console.log('Tentativo di riparazione automatica del database...');
    
    // Verifica se la tabella sessions esiste
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Errore nell\'accesso alla tabella sessions:', error);
      console.log('Dettagli errore:', JSON.stringify(error));
      
      // Tenta di creare una sessione minima di test
      console.log('Tentativo di creazione di una sessione minima...');
      const testSessionId = 'test_' + Date.now();
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          id: testSessionId,
          user_id: testUserId,
          profile_id: 'test',
          is_active: true
        });
      
      if (insertError) {
        console.error('Impossibile creare la tabella sessions:', insertError);
        console.log('L\'app utilizzerà solo lo storage locale per la persistenza');
        return false;
      }
      
      // Pulisci il record di test
      await supabase
        .from('sessions')
        .delete()
        .eq('id', testSessionId);
    }
    
    console.log('Database verificato/riparato con successo!');
    return true;
  } catch (error) {
    console.error('Errore nella riparazione automatica del database:', error);
    return false;
  }
} 