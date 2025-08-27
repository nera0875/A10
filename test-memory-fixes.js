#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections des bugs de mémoire/contexte
 * Usage: node test-memory-fixes.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseFunctions() {
  console.log('🔍 Test des fonctions de base de données...\n');

  try {
    // Test 1: Vérifier si les nouvelles fonctions existent
    console.log('1. Test existence des nouvelles fonctions');
    
    const functionsToTest = [
      'search_memories_multi',
      'search_chunks_multi', 
      'get_all_user_memories',
      'search_memories_text',
      'search_conversation_messages_multi'
    ];

    for (const funcName of functionsToTest) {
      try {
        // Test avec paramètres null pour juste vérifier l'existence
        const { data, error } = await supabase.rpc(funcName, {
          query_embedding_small: null,
          query_embedding_large: null,
          match_threshold: 0.1,
          match_count: 1
        });
        
        if (error) {
          console.log(`   ❌ ${funcName}: ${error.message}`);
        } else {
          console.log(`   ✅ ${funcName}: Disponible`);
        }
      } catch (e) {
        console.log(`   ❌ ${funcName}: Erreur - ${e.message}`);
      }
    }

    // Test 2: Vérifier les colonnes des tables
    console.log('\n2. Test structure des tables');
    
    const tables = ['memories', 'chunks', 'conversation_messages'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('embedding_model, embedding_large')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${table}: Colonnes manquantes - ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: Nouvelles colonnes présentes`);
        }
      } catch (e) {
        console.log(`   ❌ ${table}: Erreur - ${e.message}`);
      }
    }

    // Test 3: Compter les données existantes
    console.log('\n3. Statistiques des données');
    
    try {
      const { data: memoriesCount, error: memError } = await supabase
        .from('memories')
        .select('*', { count: 'exact', head: true });
      
      if (!memError) {
        console.log(`   📊 Total mémoires: ${memoriesCount || 0}`);
      }

      const { data: chunksCount, error: chunkError } = await supabase
        .from('chunks')
        .select('*', { count: 'exact', head: true });
      
      if (!chunkError) {
        console.log(`   📊 Total chunks: ${chunksCount || 0}`);
      }

      const { data: conversationsCount, error: convError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });
      
      if (!convError) {
        console.log(`   📊 Total conversations: ${conversationsCount || 0}`);
      }

    } catch (e) {
      console.log(`   ❌ Erreur statistiques: ${e.message}`);
    }

    // Test 4: Test des fonctions avec des paramètres réels
    console.log('\n4. Test fonctionnel des nouvelles fonctions');
    
    try {
      // Test search_memories_multi sans embedding (devrait retourner les mémoires récentes)
      const { data: memResult, error: memError } = await supabase.rpc('search_memories_multi', {
        query_embedding_small: null,
        query_embedding_large: null,
        match_threshold: 0.1,
        match_count: 5
      });
      
      if (memError) {
        console.log(`   ❌ search_memories_multi: ${memError.message}`);
      } else {
        console.log(`   ✅ search_memories_multi: ${memResult?.length || 0} résultats`);
      }

      // Test get_all_user_memories
      const { data: allMemResult, error: allMemError } = await supabase.rpc('get_all_user_memories', {
        target_user_id: '00000000-0000-0000-0000-000000000000', // ID fictif pour test
        memory_limit: 5
      });
      
      if (allMemError) {
        console.log(`   ❌ get_all_user_memories: ${allMemError.message}`);
      } else {
        console.log(`   ✅ get_all_user_memories: Fonction opérationnelle`);
      }

    } catch (e) {
      console.log(`   ❌ Erreur tests fonctionnels: ${e.message}`);
    }

    console.log('\n✅ Tests terminés !');
    console.log('\n📋 Prochaines étapes :');
    console.log('1. Si des fonctions sont manquantes, exécutez fix-memory-context-bugs.sql');
    console.log('2. Testez l\'application avec des questions personnelles');
    console.log('3. Vérifiez les logs pour confirmer le bon fonctionnement');

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error.message);
  }
}

async function testSearchLogic() {
  console.log('\n🧠 Test de la logique de recherche simulée...\n');

  // Simuler les étapes de recherche que fait l'API
  const testQueries = [
    'Qu\'est-ce que tu connais sur moi ?',
    'Mes informations personnelles',
    'Comment ça va ?',
    'Raconte-moi mes souvenirs'
  ];

  for (const query of testQueries) {
    console.log(`🔍 Test query: "${query}"`);
    
    // Détecter le type de question (même logique que l'API)
    const isPersonalInfoQuery = /(qu'est-ce que tu connais sur moi|que sais-tu de moi|quelles sont mes informations|mes dernières mémoires|mes mémoires|que connais-tu de moi|dis-moi ce que tu sais sur moi|quelles informations as-tu sur moi|raconte-moi ce que tu sais|parle-moi de moi|résume mes infos|toutes mes mémoires|liste mes mémoires|mes données|informations personnelles|profil personnel)/i.test(query.trim());
    
    const isSimpleGreeting = /^(bonjour|salut|hello|hi|bonsoir|bonne nuit|coucou|hey)\s*[!.?]*$/i.test(query.trim());
    const isSimpleQuestion = /^(comment ça va|ça va|comment allez-vous|comment tu vas)\s*[!.?]*$/i.test(query.trim());
    const isGeneralQuestion = /^(qui es-tu|qu'est-ce que tu fais|que peux-tu faire|aide|help)\s*[!.?]*$/i.test(query.trim());
    
    const shouldSkipMemorySearch = (isSimpleGreeting || isSimpleQuestion || isGeneralQuestion) && !isPersonalInfoQuery;

    console.log(`   - Question personnelle: ${isPersonalInfoQuery ? '✅' : '❌'}`);
    console.log(`   - Ignorer recherche mémoire: ${shouldSkipMemorySearch ? '✅' : '❌'}`);
    
    if (isPersonalInfoQuery) {
      console.log(`   🎯 Cette question devrait déclencher la récupération de TOUTES les mémoires`);
    } else if (shouldSkipMemorySearch) {
      console.log(`   💭 Cette question devrait être traitée sans recherche de mémoire`);
    } else {
      console.log(`   🔍 Cette question devrait déclencher une recherche sémantique standard`);
    }
    console.log('');
  }
}

// Fonction principale
async function main() {
  console.log('🚀 Test des corrections des bugs mémoire/contexte\n');
  console.log('=' .repeat(60));
  
  await testDatabaseFunctions();
  await testSearchLogic();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests terminés - Vérifiez les résultats ci-dessus');
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDatabaseFunctions, testSearchLogic };
