// Script de test pour vérifier le système d'historique des conversations

const testHistorySystem = async () => {
  console.log('🧪 Test du système d\'historique des conversations');
  
  try {
    // Test 1: Nouvelle conversation
    console.log('\n📝 Test 1: Création d\'une nouvelle conversation');
    const response1 = await fetch('http://localhost:3000/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Bonjour, je m\'appelle Jean et j\'aime la programmation.',
        conversationId: null // Nouvelle conversation
      })
    });
    
    if (!response1.ok) {
      throw new Error(`Erreur HTTP: ${response1.status}`);
    }
    
    // Lire la réponse en streaming
    const reader1 = response1.body?.getReader();
    const decoder = new TextDecoder();
    let conversationId = null;
    
    if (reader1) {
      while (true) {
        const { done, value } = await reader1.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'meta' && data.conversationId) {
                conversationId = data.conversationId;
                console.log(`✅ Conversation créée: ${conversationId}`);
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
    }
    
    if (!conversationId) {
      throw new Error('Impossible de récupérer l\'ID de conversation');
    }
    
    // Attendre un peu pour que la sauvegarde soit terminée
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Message de suivi dans la même conversation
    console.log('\n📝 Test 2: Message de suivi (test de mémoire)');
    const response2 = await fetch('http://localhost:3000/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Comment je m\'appelle ?',
        conversationId: conversationId
      })
    });
    
    if (!response2.ok) {
      throw new Error(`Erreur HTTP: ${response2.status}`);
    }
    
    // Lire la réponse
    const reader2 = response2.body?.getReader();
    let fullResponse = '';
    
    if (reader2) {
      while (true) {
        const { done, value } = await reader2.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content') {
                fullResponse = data.content;
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
    }
    
    console.log(`📋 Réponse reçue: ${fullResponse}`);
    
    // Vérifier si la réponse contient le nom "Jean"
    if (fullResponse.toLowerCase().includes('jean')) {
      console.log('✅ SUCCESS: L\'IA se souvient du nom!');
    } else {
      console.log('❌ ÉCHEC: L\'IA ne se souvient pas du nom.');
      console.log('Cela peut indiquer un problème avec l\'historique des conversations.');
    }
    
    console.log('\n🎉 Test terminé!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
};

// Exécuter le test
testHistorySystem();