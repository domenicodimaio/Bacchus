-- Create a function that can be called to create the profiles table
CREATE OR REPLACE FUNCTION create_profiles_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the table if it doesn't exist
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
  CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
  
  -- Enable Row Level Security
  ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
  
  -- Create policy to allow users to view their own profiles
  DO
  $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy 
      WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can view their own profiles'
    ) THEN
      CREATE POLICY "Users can view their own profiles" 
      ON "public"."profiles" FOR SELECT 
      USING (auth.uid() = user_id);
    END IF;
  END
  $$;
  
  -- Create policy to allow users to create their own profiles
  DO
  $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy 
      WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can create their own profiles'
    ) THEN
      CREATE POLICY "Users can create their own profiles" 
      ON "public"."profiles" FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
    END IF;
  END
  $$;
  
  -- Create policy to allow users to update their own profiles
  DO
  $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy 
      WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can update their own profiles'
    ) THEN
      CREATE POLICY "Users can update their own profiles" 
      ON "public"."profiles" FOR UPDATE 
      USING (auth.uid() = user_id);
    END IF;
  END
  $$;
  
  -- Create policy to allow users to delete their own profiles
  DO
  $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy 
      WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users can delete their own profiles'
    ) THEN
      CREATE POLICY "Users can delete their own profiles" 
      ON "public"."profiles" FOR DELETE 
      USING (auth.uid() = user_id);
    END IF;
  END
  $$;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profiles table: %', SQLERRM;
    RETURN false;
END;
$$; 