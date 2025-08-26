-- Accorder les permissions de base aux rôles
GRANT ALL PRIVILEGES ON usage_stats TO authenticated;
GRANT SELECT, INSERT ON usage_stats TO anon;

-- Créer les politiques RLS pour usage_stats
CREATE POLICY "Users can insert their own usage stats" ON usage_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage stats" ON usage_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow service role full access" ON usage_stats
  FOR ALL USING (true);

-- Permettre l'insertion anonyme pour les tests (optionnel, à supprimer en production)
CREATE POLICY "Allow anonymous insert for testing" ON usage_stats
  FOR INSERT WITH CHECK (true);