/**
 * Script per inizializzare il database con dati di esempio
 * 
 * Questo script crea le tabelle necessarie e inserisce dati di esempio
 * per l'applicazione AlcolTest.
 * 
 * Esecuzione: npx ts-node scripts/seed-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Carica le variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Verifica che le variabili d'ambiente siano definite
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Errore: Variabili d\'ambiente mancanti. Assicurati di aver configurato .env con:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.error('- SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Crea il client Supabase con la chiave di servizio per avere accesso completo
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Definizione delle bevande standard
const standardDrinks = [
  {
    name: 'Birra Chiara',
    category: 'Birra',
    alcohol_percentage: 5.0,
    volume_ml: 330,
    image_url: 'https://example.com/images/beer.png',
    description: 'Birra chiara standard, tipo lager o pils',
    is_standard: true,
    alcohol_grams: 13.2, // 330ml * 5% * 0.8 (densità alcol)
  },
  {
    name: 'Birra Media',
    category: 'Birra',
    alcohol_percentage: 5.0,
    volume_ml: 500,
    image_url: 'https://example.com/images/beer-large.png',
    description: 'Birra chiara in bicchiere da 500ml',
    is_standard: true,
    alcohol_grams: 20.0, // 500ml * 5% * 0.8
  },
  {
    name: 'Calice di Vino',
    category: 'Vino',
    alcohol_percentage: 12.0,
    volume_ml: 150,
    image_url: 'https://example.com/images/wine.png',
    description: 'Calice di vino standard (rosso o bianco)',
    is_standard: true,
    alcohol_grams: 14.4, // 150ml * 12% * 0.8
  },
  {
    name: 'Bicchiere di Prosecco',
    category: 'Vino',
    alcohol_percentage: 11.0,
    volume_ml: 120,
    image_url: 'https://example.com/images/prosecco.png',
    description: 'Bicchiere di prosecco o spumante',
    is_standard: true,
    alcohol_grams: 10.6, // 120ml * 11% * 0.8
  },
  {
    name: 'Shot di Vodka',
    category: 'Superalcolici',
    alcohol_percentage: 40.0,
    volume_ml: 40,
    image_url: 'https://example.com/images/vodka.png',
    description: 'Shot di vodka standard',
    is_standard: true,
    alcohol_grams: 12.8, // 40ml * 40% * 0.8
  },
  {
    name: 'Gin Tonic',
    category: 'Cocktail',
    alcohol_percentage: 14.0,
    volume_ml: 200,
    image_url: 'https://example.com/images/gin-tonic.png',
    description: 'Gin tonic classico',
    is_standard: true,
    alcohol_grams: 22.4, // 200ml * 14% * 0.8
  },
  {
    name: 'Spritz',
    category: 'Cocktail',
    alcohol_percentage: 11.0,
    volume_ml: 200,
    image_url: 'https://example.com/images/spritz.png',
    description: 'Spritz classico con Aperol o Campari',
    is_standard: true,
    alcohol_grams: 17.6, // 200ml * 11% * 0.8
  },
  {
    name: 'Negroni',
    category: 'Cocktail',
    alcohol_percentage: 28.0,
    volume_ml: 100,
    image_url: 'https://example.com/images/negroni.png',
    description: 'Cocktail Negroni classico',
    is_standard: true,
    alcohol_grams: 22.4, // 100ml * 28% * 0.8
  },
  {
    name: 'Amaro',
    category: 'Digestivi',
    alcohol_percentage: 30.0,
    volume_ml: 40,
    image_url: 'https://example.com/images/amaro.png',
    description: 'Amaro digestivo',
    is_standard: true,
    alcohol_grams: 9.6, // 40ml * 30% * 0.8
  },
  {
    name: 'Bicchiere di Whisky',
    category: 'Superalcolici',
    alcohol_percentage: 43.0,
    volume_ml: 50,
    image_url: 'https://example.com/images/whisky.png',
    description: 'Whisky servito liscio',
    is_standard: true,
    alcohol_grams: 17.2, // 50ml * 43% * 0.8
  },
];

// Definizione delle categorie di bevande
const drinkCategories = [
  { name: 'Birra', icon: 'beer', color: '#FFC107' },
  { name: 'Vino', icon: 'wine', color: '#E91E63' },
  { name: 'Superalcolici', icon: 'liquor', color: '#9C27B0' },
  { name: 'Cocktail', icon: 'cocktail', color: '#2196F3' },
  { name: 'Digestivi', icon: 'glass-wine', color: '#4CAF50' },
  { name: 'Altro', icon: 'glass-cocktail', color: '#607D8B' },
];

// Funzione principale per inizializzare il database
async function seedDatabase() {
  console.log('Inizializzazione del database...');

  try {
    // 1. Crea la tabella per le categorie di bevande se non esiste
    console.log('Creazione tabella drink_categories...');
    const { error: createCategoriesError } = await supabase.rpc('create_drink_categories_table');
    
    if (createCategoriesError) {
      console.error('Errore nella creazione della tabella drink_categories:', createCategoriesError);
    } else {
      console.log('Tabella drink_categories creata o già esistente.');
      
      // Inserisci le categorie di bevande
      for (const category of drinkCategories) {
        const { error: insertCategoryError } = await supabase
          .from('drink_categories')
          .upsert(category, { onConflict: 'name' });
        
        if (insertCategoryError) {
          console.error(`Errore nell'inserimento della categoria ${category.name}:`, insertCategoryError);
        }
      }
      console.log('Categorie di bevande inserite.');
    }

    // 2. Crea la tabella per le bevande standard se non esiste
    console.log('Creazione tabella standard_drinks...');
    const { error: createDrinksError } = await supabase.rpc('create_standard_drinks_table');
    
    if (createDrinksError) {
      console.error('Errore nella creazione della tabella standard_drinks:', createDrinksError);
    } else {
      console.log('Tabella standard_drinks creata o già esistente.');
      
      // Inserisci le bevande standard
      for (const drink of standardDrinks) {
        const { error: insertDrinkError } = await supabase
          .from('standard_drinks')
          .upsert(drink, { onConflict: 'name' });
        
        if (insertDrinkError) {
          console.error(`Errore nell'inserimento della bevanda ${drink.name}:`, insertDrinkError);
        }
      }
      console.log('Bevande standard inserite.');
    }

    // 3. Crea la tabella per i consumi di bevande se non esiste
    console.log('Creazione tabella drink_consumptions...');
    const { error: createConsumptionsError } = await supabase.rpc('create_drink_consumptions_table');
    
    if (createConsumptionsError) {
      console.error('Errore nella creazione della tabella drink_consumptions:', createConsumptionsError);
    } else {
      console.log('Tabella drink_consumptions creata o già esistente.');
    }

    // 4. Crea la tabella per le sessioni di consumo se non esiste
    console.log('Creazione tabella drinking_sessions...');
    const { error: createSessionsError } = await supabase.rpc('create_drinking_sessions_table');
    
    if (createSessionsError) {
      console.error('Errore nella creazione della tabella drinking_sessions:', createSessionsError);
    } else {
      console.log('Tabella drinking_sessions creata o già esistente.');
    }

    // 5. Crea la tabella per i profili utente se non esiste
    console.log('Creazione tabella user_profiles...');
    const { error: createProfilesError } = await supabase.rpc('create_user_profiles_table');
    
    if (createProfilesError) {
      console.error('Errore nella creazione della tabella user_profiles:', createProfilesError);
    } else {
      console.log('Tabella user_profiles creata o già esistente.');
    }

    // 6. Crea le stored procedures e funzioni SQL
    console.log('Creazione stored procedures e funzioni...');
    
    // Funzione per calcolare il BAC (Blood Alcohol Content)
    const calculateBacFunction = `
    CREATE OR REPLACE FUNCTION calculate_bac(
      weight FLOAT,
      gender TEXT,
      alcohol_grams FLOAT,
      hours_elapsed FLOAT
    ) RETURNS FLOAT AS $$
    DECLARE
      bac FLOAT;
      gender_factor FLOAT;
    BEGIN
      -- Imposta il fattore di genere (0.68 per maschi, 0.55 per femmine)
      IF gender = 'male' THEN
        gender_factor := 0.68;
      ELSE
        gender_factor := 0.55;
      END IF;
      
      -- Formula di Widmark per il calcolo del BAC
      -- BAC = (A / (W * r)) - (0.015 * H)
      -- Dove:
      -- A = grammi di alcol consumati
      -- W = peso in kg
      -- r = fattore di genere
      -- H = ore trascorse dal consumo
      -- 0.015 = tasso di eliminazione dell'alcol per ora
      
      bac := (alcohol_grams / (weight * gender_factor)) - (0.015 * hours_elapsed);
      
      -- Assicurati che il BAC non sia negativo
      IF bac < 0 THEN
        bac := 0;
      END IF;
      
      RETURN bac;
    END;
    $$ LANGUAGE plpgsql;
    `;
    
    const { error: createBacFunctionError } = await supabase.rpc('execute_sql', { 
      sql_query: calculateBacFunction 
    });
    
    if (createBacFunctionError) {
      console.error('Errore nella creazione della funzione calculate_bac:', createBacFunctionError);
    } else {
      console.log('Funzione calculate_bac creata.');
    }

    console.log('Inizializzazione del database completata con successo!');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione del database:', error);
  }
}

// Esegui la funzione principale
seedDatabase()
  .then(() => {
    console.log('Script completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Errore fatale:', error);
    process.exit(1);
  }); 