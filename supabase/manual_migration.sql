-- Aggiungi le colonne mancanti alla tabella profiles
ALTER TABLE IF EXISTS "public"."profiles" 
ADD COLUMN IF NOT EXISTS "color" TEXT,
ADD COLUMN IF NOT EXISTS "_h" TEXT;

-- Se è necessario ricreare completamente la tabella, esegui questo script
-- DROP TABLE IF EXISTS "public"."profiles";

-- Create a table for user profiles with tutte le colonne necessarie
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "weightKg" NUMERIC NOT NULL,
  "age" INTEGER NOT NULL,
  "height" NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL,
  "color" TEXT,
  "_h" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON "public"."profiles"(user_id);

-- Enable Row Level Security
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profiles
CREATE POLICY "Users can view their own profiles" 
ON "public"."profiles" FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to create their own profiles
CREATE POLICY "Users can create their own profiles" 
ON "public"."profiles" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own profiles
CREATE POLICY "Users can update their own profiles" 
ON "public"."profiles" FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own profiles
CREATE POLICY "Users can delete their own profiles" 
ON "public"."profiles" FOR DELETE 
USING (auth.uid() = user_id); 