/**
 * Script de test simple pour vérifier les corrections de mémoire
 */

console.log('🔍 Test de détection des questions personnelles...\n');

const testQueries = [
  'Qu\'est-ce que tu connais sur moi ?',
  'Que sais-tu de moi ?',
  'Mes informations personnelles',
  'Dis-moi ce que tu sais sur moi',
  'Raconte-moi ce que tu sais',
  'Toutes mes mémoires',
  'Liste mes mémoires',
  'Bonjour',
  'Comment ça va ?',
  'Qui es-tu ?',
  'Aide-moi',
  'Parle-moi de Paris', // Question normale qui devrait faire une recherche sémantique
];

// Pattern de détection des questions personnelles (même que dans l'API)
const personalInfoPattern = /(qu'est-ce que tu connais sur moi|que sais-tu de moi|quelles sont mes informations|mes dernières mémoires|mes mémoires|que connais-tu de moi|dis-moi ce que tu sais sur moi|quelles informations as-tu sur moi|raconte-moi ce que tu sais|parle-moi de moi|résume mes infos|toutes mes mémoires|liste mes mémoires|mes données|informations personnelles|profil personnel)/i;

// Patterns pour les questions simples
const simpleGreetingPattern = /^(bonjour|salut|hello|hi|bonsoir|bonne nuit|coucou|hey)\s*[!.?]*$/i;
const simpleQuestionPattern = /^(comment ça va|ça va|comment allez-vous|comment tu vas)\s*[!.?]*$/i;
const generalQuestionPattern = /^(qui es-tu|qu'est-ce que tu fais|que peux-tu faire|aide|help)\s*[!.?]*$/i;

testQueries.forEach((query, index) => {
  console.log(`${index + 1}. "${query}"`);
  
  const isPersonalInfoQuery = personalInfoPattern.test(query.trim());
  const isSimpleGreeting = simpleGreetingPattern.test(query.trim());
  const isSimpleQuestion = simpleQuestionPattern.test(query.trim());
  const isGeneralQuestion = generalQuestionPattern.test(query.trim());
  const shouldSkipMemorySearch = (isSimpleGreeting || isSimpleQuestion || isGeneralQuestion) && !isPersonalInfoQuery;
  
  if (isPersonalInfoQuery) {
    console.log('   🎯 QUESTION PERSONNELLE → Récupération de TOUTES les mémoires');
  } else if (shouldSkipMemorySearch) {
    console.log('   💭 Question simple → Pas de recherche mémoire');
  } else {
    console.log('   🔍 Question normale → Recherche sémantique standard');
  }
  
  console.log('');
});

console.log('✅ Test de logique terminé');
console.log('\n📋 Résultats attendus :');
console.log('- Questions 1-7 : Devraient récupérer TOUTES les mémoires');
console.log('- Questions 8-11 : Pas de recherche mémoire (réponse directe)');
console.log('- Question 12 : Recherche sémantique normale');

console.log('\n🚀 Prochaines étapes :');
console.log('1. Exécutez le script SQL fix-memory-context-bugs.sql dans Supabase');
console.log('2. Testez ces questions dans votre application');
console.log('3. Vérifiez que les questions personnelles retournent toutes vos mémoires');
