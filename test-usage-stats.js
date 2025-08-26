const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration Supabase
const supabaseUrl = 'https://clcpszhztwfhnvirexao.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3Bzemh6dHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzY1NDIsImV4cCI6MjA3MTQ1MjU0Mn0.PWnQqh6lKQKKO8-9_GoyzWxKLNVxWsVWoZ-fdMPb2HA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsageStats() {
  console.log('🔍 Test des statistiques d\'usage...');
  console.log('================================');

  try {
    // 1. Test de connexion à Supabase
    console.log('\n1. Test de connexion Supabase...');
    const { data: tables, error: tablesError } = await supabase
      .from('usage_stats')
      .select('count', { count: 'exact', head: true });
    
    if (tablesError) {
      console.error('❌ Erreur connexion Supabase:', tablesError);
      return;
    }
    console.log('✅ Connexion Supabase OK');

    // 2. Vérifier si la table usage_stats existe et contient des données
    console.log('\n2. Vérification de la table usage_stats...');
    const { data: usageData, error: usageError, count } = await supabase
      .from('usage_stats')
      .select('*', { count: 'exact' })
      .limit(10);

    if (usageError) {
      console.error('❌ Erreur lecture usage_stats:', usageError);
      return;
    }

    console.log(`📊 Nombre total d'enregistrements: ${count}`);
    console.log('📋 Derniers enregistrements:');
    console.log(JSON.stringify(usageData, null, 2));

    // 3. Test de l'API /api/usage
    console.log('\n3. Test de l\'API /api/usage...');
    try {
      const response = await fetch('http://localhost:3000/api/usage');
      const apiData = await response.json();
      
      if (response.ok) {
        console.log('✅ API /api/usage fonctionne');
        console.log('📊 Données API:', JSON.stringify(apiData, null, 2));
      } else {
        console.error('❌ Erreur API:', apiData);
      }
    } catch (apiError) {
      console.error('❌ Erreur appel API:', apiError.message);
    }

    // 4. Vérifier les permissions
    console.log('\n4. Test des permissions...');
    const testUserId = 'a216aa77-e8dc-413c-a279-829b4725f8c4';
    
    // Test INSERT (sans conversation_id pour éviter la contrainte FK)
    const { data: insertData, error: insertError } = await supabase
      .from('usage_stats')
      .insert({
        user_id: testUserId,
        model_used: 'gpt-4o-mini',
        tokens_input: 10,
        tokens_output: 20,
        cost_input: 0.001,
        cost_output: 0.002,
        total_cost: 0.003,
        conversation_id: null,
        cache_hit: false
      })
      .select();

    if (insertError) {
      console.error('❌ Erreur INSERT:', insertError);
    } else {
      console.log('✅ INSERT fonctionne');
      
      // Test DELETE du test
      await supabase
        .from('usage_stats')
        .delete()
        .eq('user_id', testUserId);
      console.log('🧹 Données de test supprimées');
    }

    // 5. Analyser les logs récents
    console.log('\n5. Analyse des données récentes...');
    const { data: recentData } = await supabase
      .from('usage_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentData && recentData.length > 0) {
      console.log('📈 Dernières statistiques:');
      recentData.forEach((stat, index) => {
        console.log(`${index + 1}. Modèle: ${stat.model_used}, Coût: ${stat.total_cost}€, Date: ${stat.created_at}`);
      });
    } else {
      console.log('⚠️  Aucune donnée récente trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testUsageStats().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});