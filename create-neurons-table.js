require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🗄️ Création de la table user_configs pour les Neurones...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    console.log('📋 Exécution du script SQL...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Créer la table pour stocker les configurations utilisateur
        CREATE TABLE IF NOT EXISTS user_configs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          config_type TEXT NOT NULL,
          config JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          
          -- Contrainte unique pour éviter les doublons
          UNIQUE(user_id, config_type)
        );

        -- Index pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_configs_type ON user_configs(config_type);

        -- RLS (Row Level Security)
        ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

        -- Politique pour que les utilisateurs ne voient que leurs propres configs
        DROP POLICY IF EXISTS "Users can view own configs" ON user_configs;
        CREATE POLICY "Users can view own configs" ON user_configs
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own configs" ON user_configs;
        CREATE POLICY "Users can insert own configs" ON user_configs
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update own configs" ON user_configs;
        CREATE POLICY "Users can update own configs" ON user_configs
          FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete own configs" ON user_configs;
        CREATE POLICY "Users can delete own configs" ON user_configs
          FOR DELETE USING (auth.uid() = user_id);
      `
    });

    if (error) {
      console.log('❌ Erreur SQL:', error.message);
      
      // Essayer méthode alternative
      console.log('🔄 Tentative avec des requêtes séparées...');
      
      const createTableResult = await supabase
        .from('user_configs')
        .select('id')
        .limit(1);
        
      if (createTableResult.error && createTableResult.error.code === '42P01') {
        console.log('❌ Table user_configs n\'existe pas et ne peut pas être créée automatiquement');
        console.log('💡 Solution manuelle:');
        console.log('1. Allez sur https://supabase.com/dashboard');
        console.log('2. SQL Editor');
        console.log('3. Copiez ce SQL:');
        console.log(`
CREATE TABLE user_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_type TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, config_type)
);

ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own configs" ON user_configs
  FOR ALL USING (auth.uid() = user_id);
        `);
        return false;
      } else {
        console.log('✅ Table user_configs semble déjà exister!');
        return true;
      }
    } else {
      console.log('✅ Table user_configs créée avec succès!');
      return true;
    }
    
  } catch (error) {
    console.log('❌ Erreur:', error.message);
    console.log('💡 Créez manuellement la table via le dashboard Supabase');
    return false;
  }
}

createTable().then(success => {
  if (success) {
    console.log('🎉 Configuration Neurones prête!');
  } else {
    console.log('⚠️ Veuillez créer la table manuellement');
  }
  process.exit(success ? 0 : 1);
});
