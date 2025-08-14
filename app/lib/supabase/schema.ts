/**
 * Supabase Database Schema
 * 
 * This file defines the database schema for the Supabase tables
 * and provides TypeScript types for each table.
 */

// User Profiles Table
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  weightKg: number;
  age: number;
  height: number;
  gender: 'male' | 'female';
  drinkingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'frequently';
  color?: string;
  emoji?: string;
  created_at: string;
  updated_at: string;
}

// Drinking Sessions Table
export interface Session {
  id: string;
  user_id: string;
  profile_id: string;
  start_time: string;
  end_time: string | null;
  max_bac: number;
  current_bac: number;
  mode: 'simple' | 'advanced';
  created_at: string;
  updated_at: string;
}

// Drinks Table
export interface Drink {
  id: string;
  session_id: string;
  name: string;
  volume_ml: number;
  alcohol_percentage: number;
  time_consumed: string;
  alcohol_grams: number;
  created_at: string;
}

// Food Table
export interface Food {
  id: string;
  session_id: string;
  name: string;
  type: 'Light Snack' | 'Small Meal' | 'Full Meal' | 'Heavy Meal' | 'Custom';
  amount: 'Small' | 'Medium' | 'Large';
  time_consumed: string;
  absorption_factor: number;
  created_at: string;
}

// Beverage Types Table (reference data)
export interface BeverageType {
  id: string;
  name: string;
  default_percentage: number;
  category: 'Beer' | 'Wine' | 'Spirits' | 'Cocktail' | 'Other';
  icon: string;
  created_at: string;
}

// SQL Definitions for creating tables (for reference)
export const SQL_DEFINITIONS = {
  profiles: `
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES auth.users NOT NULL,
      name TEXT NOT NULL,
      weightKg NUMERIC NOT NULL,
      age INT NOT NULL,
      height NUMERIC NOT NULL,
      gender TEXT NOT NULL,
      drinkingFrequency TEXT NOT NULL,
      color TEXT,
      emoji TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index on user_id for faster lookups
    CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
    
    -- RLS Policies
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their own profiles" ON profiles 
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own profiles" ON profiles 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own profiles" ON profiles 
      FOR UPDATE USING (auth.uid() = user_id);
  `,
  
  sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users NOT NULL,
      profile_id UUID REFERENCES profiles NOT NULL,
      start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      end_time TIMESTAMP WITH TIME ZONE,
      max_bac NUMERIC DEFAULT 0,
      current_bac NUMERIC DEFAULT 0,
      mode TEXT DEFAULT 'advanced',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index on user_id for faster lookups
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_profile_id_idx ON sessions(profile_id);
    
    -- RLS Policies
    ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their own sessions" ON sessions 
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own sessions" ON sessions 
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own sessions" ON sessions 
      FOR UPDATE USING (auth.uid() = user_id);
  `,
  
  drinks: `
    CREATE TABLE IF NOT EXISTS drinks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID REFERENCES sessions NOT NULL,
      name TEXT NOT NULL,
      volume_ml NUMERIC NOT NULL,
      alcohol_percentage NUMERIC NOT NULL,
      time_consumed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      alcohol_grams NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index on session_id for faster lookups
    CREATE INDEX IF NOT EXISTS drinks_session_id_idx ON drinks(session_id);
    
    -- RLS Policies
    ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their own drinks through sessions" ON drinks 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = drinks.session_id AND s.user_id = auth.uid()
        )
      );
    CREATE POLICY "Users can insert their own drinks through sessions" ON drinks 
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = drinks.session_id AND s.user_id = auth.uid()
        )
      );
  `,
  
  foods: `
    CREATE TABLE IF NOT EXISTS foods (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID REFERENCES sessions NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      time_consumed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      absorption_factor NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index on session_id for faster lookups
    CREATE INDEX IF NOT EXISTS foods_session_id_idx ON foods(session_id);
    
    -- RLS Policies
    ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view their own foods through sessions" ON foods 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = foods.session_id AND s.user_id = auth.uid()
        )
      );
    CREATE POLICY "Users can insert their own foods through sessions" ON foods 
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM sessions s 
          WHERE s.id = foods.session_id AND s.user_id = auth.uid()
        )
      );
  `,
  
  beverage_types: `
    CREATE TABLE IF NOT EXISTS beverage_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      default_percentage NUMERIC NOT NULL,
      category TEXT NOT NULL,
      icon TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- RLS Policies
    ALTER TABLE beverage_types ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can view beverage types" ON beverage_types 
      FOR SELECT USING (true);
    CREATE POLICY "Only admins can insert beverage types" ON beverage_types 
      FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM admins));
  `
}; 