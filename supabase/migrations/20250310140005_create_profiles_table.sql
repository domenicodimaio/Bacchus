-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" TEXT PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  "weightKg" NUMERIC NOT NULL,
  "age" INTEGER NOT NULL,
  "height" NUMERIC NOT NULL,
  "drinkingFrequency" TEXT NOT NULL CHECK (drinkingFrequency IN ('rarely', 'occasionally', 'regularly', 'frequently')),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Enable Row Level Security
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profiles
CREATE POLICY "Users can view their own profiles" 
ON "profiles" FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to create their own profiles
CREATE POLICY "Users can create their own profiles" 
ON "profiles" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own profiles
CREATE POLICY "Users can update their own profiles" 
ON "profiles" FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own profiles
CREATE POLICY "Users can delete their own profiles" 
ON "profiles" FOR DELETE 
USING (auth.uid() = user_id);

-- Create a function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
