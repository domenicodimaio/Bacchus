-- Drop existing tables if they exist
DROP TABLE IF EXISTS "public"."active_sessions";
DROP TABLE IF EXISTS "public"."session_history";

-- Create a single table for all sessions
CREATE TABLE IF NOT EXISTS "public"."sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "profile_id" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "session_data" JSONB NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON "public"."sessions"(user_id);
CREATE INDEX IF NOT EXISTS sessions_profile_id_idx ON "public"."sessions"(profile_id);
CREATE INDEX IF NOT EXISTS sessions_is_active_idx ON "public"."sessions"(is_active);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON "public"."sessions"(created_at);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_session_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON "public"."sessions"
FOR EACH ROW
EXECUTE FUNCTION update_session_updated_at_column();

-- Enable RLS
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sessions" 
ON "public"."sessions" FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON "public"."sessions" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON "public"."sessions" FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON "public"."sessions" FOR DELETE 
USING (auth.uid() = user_id);

-- Function to get active session for a user
CREATE OR REPLACE FUNCTION get_active_session(user_id UUID)
RETURNS TABLE (
  id TEXT,
  profile_id TEXT,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.profile_id, s.session_data, s.created_at, s.updated_at
  FROM sessions s
  WHERE s.user_id = get_active_session.user_id
  AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get session history for a user
CREATE OR REPLACE FUNCTION get_session_history(user_id UUID)
RETURNS TABLE (
  id TEXT,
  profile_id TEXT,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.profile_id, s.session_data, s.created_at, s.updated_at
  FROM sessions s
  WHERE s.user_id = get_session_history.user_id
  AND s.is_active = false
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql; 