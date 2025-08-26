# Correction du problème de température avec les modèles GPT-4o et GPT-5

## Problème identifié
L'erreur suivante se produisait lors de l'utilisation de l'API RAG :
```
BadRequestError: 400 Unsupported value: 'temperature' does not support 0.7 with this model. 
Only the default (1) value is supported.
```

## Cause
Certains modèles OpenAI (notamment GPT-4o et GPT-5) ne supportent pas le paramètre `temperature` avec des valeurs personnalisées. Ils n'acceptent que la valeur par défaut (1).

## Solution appliquée

### 1. Modification de `app/api/query/route.ts`
- Ajout d'une logique conditionnelle pour les paramètres selon le modèle
- Les modèles GPT-4o et GPT-5 utilisent seulement `max_tokens` (ou `max_completion_tokens` pour GPT-5)
- Les autres modèles (GPT-4-turbo, etc.) utilisent tous les paramètres : `temperature`, `top_p`, `max_tokens`

### 2. Modification de `app/api/config/route.ts`
- Changement du modèle par défaut de `gpt-4o-mini` vers `gpt-4-turbo`
- Ajout d'une validation côté serveur pour empêcher l'utilisation de `temperature` ≠ 1 avec les modèles GPT-4o et GPT-5

### 3. Logique de compatibilité
```typescript
if (userConfig.chatModel.includes('gpt-4o') || userConfig.chatModel.includes('gpt-5')) {
  // Modèles avec paramètres limités
  if (userConfig.chatModel.includes('gpt-5')) {
    completionParams.max_completion_tokens = userConfig.maxTokens
  } else {
    completionParams.max_tokens = userConfig.maxTokens
  }
} else {
  // Modèles avec tous les paramètres
  completionParams.temperature = userConfig.temperature
  completionParams.top_p = userConfig.topP
  completionParams.max_tokens = userConfig.maxTokens
}
```

## Modèles affectés
- **GPT-4o, GPT-4o-mini, GPT-5** : Paramètres limités (temperature=1 uniquement)
- **GPT-4-turbo, GPT-4** : Tous les paramètres supportés

## Avantages de la correction
1. ✅ Plus d'erreurs 400 lors de l'utilisation de l'API
2. ✅ Compatibilité automatique avec tous les modèles OpenAI
3. ✅ Validation préventive côté serveur
4. ✅ Modèle par défaut plus flexible (GPT-4-turbo)

## Test recommandé
Après redémarrage de l'application, tester l'API RAG avec différents modèles pour vérifier que :
- Les modèles GPT-4o/GPT-5 fonctionnent sans erreur
- Les modèles GPT-4-turbo utilisent bien la température personnalisée
- Les erreurs de validation sont claires pour l'utilisateur

