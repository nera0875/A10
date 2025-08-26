const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIUsage() {
  console.log('🧪 Test des données d\'usage OpenAI...');
  console.log('Modèle testé: gpt-5-2025-08-07');
  
  try {
    // Test 1: Appel simple sans streaming
    console.log('\n📊 Test 1: Appel simple sans streaming');
    const simpleCompletion = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: [{ role: 'user', content: 'Dis bonjour en une phrase.' }],
      max_completion_tokens: 50
    });
    
    console.log('Usage data (simple):', simpleCompletion.usage);
    console.log('Response:', simpleCompletion.choices[0].message.content);
    
    // Test 2: Appel avec streaming et include_usage
    console.log('\n📊 Test 2: Appel avec streaming et include_usage');
    const streamCompletion = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: [{ role: 'user', content: 'Dis bonjour en une phrase.' }],
      max_completion_tokens: 50,
      stream: true,
      stream_options: { include_usage: true }
    });
    
    let streamUsage = null;
    let content = '';
    let chunkCount = 0;
    
    for await (const chunk of streamCompletion) {
      chunkCount++;
      
      if (chunk.choices[0]?.delta?.content) {
        content += chunk.choices[0].delta.content;
      }
      
      if (chunk.usage) {
        streamUsage = chunk.usage;
        console.log(`Usage data trouvé dans le chunk ${chunkCount}:`, chunk.usage);
      }
      
      if (chunk.choices[0]?.finish_reason) {
        console.log('Stream terminé, finish_reason:', chunk.choices[0].finish_reason);
        break;
      }
    }
    
    console.log('Usage data final (stream):', streamUsage);
    console.log('Response (stream):', content);
    console.log('Nombre total de chunks:', chunkCount);
    
    // Test 3: Vérifier avec un autre modèle pour comparaison
    console.log('\n📊 Test 3: Comparaison avec gpt-4o-mini');
    const gpt4oCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Dis bonjour en une phrase.' }],
      max_tokens: 50,
      stream: true,
      stream_options: { include_usage: true }
    });
    
    let gpt4oUsage = null;
    let gpt4oContent = '';
    let gpt4oChunkCount = 0;
    
    for await (const chunk of gpt4oCompletion) {
      gpt4oChunkCount++;
      
      if (chunk.choices[0]?.delta?.content) {
        gpt4oContent += chunk.choices[0].delta.content;
      }
      
      if (chunk.usage) {
        gpt4oUsage = chunk.usage;
        console.log(`Usage data GPT-4o-mini dans le chunk ${gpt4oChunkCount}:`, chunk.usage);
      }
      
      if (chunk.choices[0]?.finish_reason) {
        break;
      }
    }
    
    console.log('Usage data final (gpt-4o-mini):', gpt4oUsage);
    console.log('Response (gpt-4o-mini):', gpt4oContent);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Exécuter le test
testOpenAIUsage().then(() => {
  console.log('\n✅ Test terminé');
}).catch(console.error);