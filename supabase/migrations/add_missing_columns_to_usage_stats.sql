-- Add missing columns to usage_stats table
-- This migration adds cache_savings and endpoint columns that are required by the usage calculator

ALTER TABLE usage_stats 
ADD COLUMN IF NOT EXISTS cache_savings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS endpoint TEXT;

-- Add comment to document the purpose of new columns
COMMENT ON COLUMN usage_stats.cache_savings IS 'Amount saved due to cache hits in euros';
COMMENT ON COLUMN usage_stats.endpoint IS 'API endpoint that generated this usage record';

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON usage_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_stats TO authenticated;