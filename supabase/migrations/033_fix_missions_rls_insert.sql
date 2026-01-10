-- Migration 033: Fix missions RLS policy to allow inserts
-- The existing policy only had USING clause, which doesn't work for INSERT operations

-- Drop the existing policy
DROP POLICY IF EXISTS missions_user_policy ON missions;

-- Create new policy with both USING and WITH CHECK
CREATE POLICY missions_user_policy ON missions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
