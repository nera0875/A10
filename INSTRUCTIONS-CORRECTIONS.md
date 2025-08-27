# 🔧 Instructions pour appliquer les corrections des bugs mémoire/contexte

## 🚨 Problème résolu

Votre LLM ne récupère que 2 éléments au lieu de toutes vos mémoires à cause de :
1. Fonctions de recherche manquantes dans la base de données
2. Support incomplet des embeddings large (text-embedding-3-large)
3. Logique de recherche fragile qui échoue facilement
4. Seuils de recherche trop restrictifs

## ⚡ Solution rapide (5 minutes)

### Étape 1 : Appliquer la migration SQL

1. **Ouvrez Supabase Dashboard**
   - Allez sur [supabase.com](https://supabase.com)
   - Sélectionnez votre projet
   - Cliquez sur "SQL Editor" dans le menu latéral

2. **Exécutez le script de correction**
   - Copiez TOUT le contenu du fichier `fix-memory-context-bugs.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" (bouton vert)

3. **Vérifiez l'exécution**
   - Vous devriez voir des messages comme "Migration terminée - Mémoires: X, Chunks: Y"
   - Le script a été corrigé suite à la review pour éliminer les erreurs de syntaxe SQL
   - Si des erreurs apparaissent, relancez le script (il est idempotent)

### Étape 2 : Redémarrer l'application

```bash
# Si vous développez localement
npm run dev
# ou
yarn dev

# Si déployé sur Vercel, rien à faire (redémarrage auto)
```

### Étape 3 : Tester immédiatement

Posez ces questions à votre LLM :
- "Qu'est-ce que tu connais sur moi ?"
- "Quelles sont mes informations personnelles ?"
- "Dis-moi ce que tu sais sur moi"

**Résultat attendu :** Le LLM devrait maintenant mentionner TOUTES vos mémoires, pas seulement 2.

## 🧪 Tests de validation

### Test automatique

```bash
node test-memory-simple.js
```

Ceci teste la logique de détection des questions personnelles.

### Test manuel dans l'application

1. **Questions personnelles** (devraient récupérer toutes les mémoires) :
   - "Que sais-tu de moi ?"
   - "Résume mes informations"
   - "Toutes mes mémoires"
   - "Liste mes mémoires"

2. **Questions normales** (recherche sémantique) :
   - "Parle-moi de [sujet dans vos mémoires]"
   - Questions spécifiques sur vos documents

3. **Questions simples** (pas de recherche) :
   - "Bonjour"
   - "Comment ça va ?"

## 🔍 Vérification des logs

Dans les logs de votre application, vous devriez maintenant voir :
- ✅ "Résultats finaux de recherche: X mémoires, Y chunks" (avec X > 2)
- ✅ "Question personnelle détectée, récupération de toutes les mémoires"
- ✅ Messages de fallback si certaines fonctions échouent

## 🛠️ Si ça ne marche toujours pas

### Diagnostic rapide

1. **Vérifiez vos mémoires dans Supabase** :
   ```sql
   SELECT COUNT(*) FROM memories WHERE user_id = auth.uid();
   ```

2. **Testez les nouvelles fonctions** :
   ```sql
   SELECT * FROM search_memories_multi(null, null, 0.1, 10, auth.uid());
   ```

3. **Vérifiez les logs d'erreur** dans votre application

### Problèmes courants

**"function search_memories_multi does not exist"**
→ Le script SQL n'a pas été exécuté correctement. Relancez-le.

**"Aucune mémoire trouvée"**  
→ Vos mémoires n'ont peut-être pas d'embeddings. Essayez de recréer une mémoire.

**"Toujours que 2 résultats"**
→ Vérifiez les logs pour voir quelle étape de recherche est utilisée.

## 📋 Détails techniques (optionnel)

### Nouvelles fonctions créées :
- `search_memories_multi()` - Recherche avec embeddings small/large
- `search_chunks_multi()` - Idem pour les documents  
- `search_conversation_messages_multi()` - Idem pour l'historique
- `get_all_user_memories()` - Récupération complète
- `search_memories_text()` - Recherche textuelle de fallback

### Nouvelles colonnes :
- `embedding_large` (3072 dimensions) pour tous les types de contenu
- `embedding_model` pour tracer quel modèle a été utilisé

### Logique de recherche améliorée :
1. Tentative avec nouvelles fonctions multi-embeddings
2. Fallback vers fonctions classiques
3. Pour questions personnelles : récupération directe de toutes les mémoires
4. Fallback final avec seuil très bas

## ✅ Confirmation du succès

Après application des corrections, vous devriez observer :
- 🎯 Questions comme "Que sais-tu de moi ?" retournent un résumé complet
- 🔍 Recherche sémantique plus robuste et fiable
- 📊 Logs détaillés montrant les étapes de recherche
- 💪 Application qui ne "casse" plus en cas d'erreur de recherche
- 🚀 Support complet des embeddings large (text-embedding-3-large)

**Temps total estimé : 5-10 minutes**

---

💡 **Astuce** : Gardez un œil sur les logs de votre application la première fois pour voir les étapes de recherche en action !
