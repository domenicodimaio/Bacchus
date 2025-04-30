-- Aggiorna la tabella se già esiste
DO $$
BEGIN
    -- Controlla se la tabella sessions esiste
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
    ) THEN
        -- Verifica se la colonna session_data esiste
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sessions' 
            AND column_name = 'session_data'
        ) THEN
            -- Aggiungi la colonna session_data se non esiste
            ALTER TABLE public.sessions ADD COLUMN session_data JSONB;
        END IF;
    ELSE
        -- Crea la tabella sessions se non esiste
        CREATE TABLE IF NOT EXISTS "public"."sessions" (
            "id" TEXT PRIMARY KEY,
            "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            "session_data" JSONB NOT NULL,
            "is_active" BOOLEAN DEFAULT true,
            "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Crea indici per query comuni
        CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON "public"."sessions"(user_id);
        CREATE INDEX IF NOT EXISTS sessions_profile_id_idx ON "public"."sessions"(profile_id);
        CREATE INDEX IF NOT EXISTS sessions_is_active_idx ON "public"."sessions"(is_active);
        CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON "public"."sessions"(created_at);
    END IF;
END
$$;

-- Aggiorna la cache dello schema di PostgREST
NOTIFY pgrst, 'reload schema'; 