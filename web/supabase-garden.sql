-- ============================================================
-- Digital Garden: garden_items table + RLS
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS garden_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_id TEXT NOT NULL,
  doodle_svg TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_id, origin_id)
);

-- Enable RLS
ALTER TABLE garden_items ENABLE ROW LEVEL SECURITY;

-- SELECT: couple members can read
CREATE POLICY "Couple members can view garden items"
  ON garden_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM couple_members
      WHERE couple_members.couple_id = garden_items.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- INSERT: must be creator and couple member
CREATE POLICY "Couple members can create garden items"
  ON garden_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM couple_members
      WHERE couple_members.couple_id = garden_items.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- UPDATE: creator only (caption updates)
CREATE POLICY "Creator can update own garden items"
  ON garden_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: creator only
CREATE POLICY "Creator can delete own garden items"
  ON garden_items FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Enable realtime replication
-- NOTE: If this fails, enable realtime for garden_items
-- via Supabase Dashboard > Database > Replication > garden_items
ALTER PUBLICATION supabase_realtime ADD TABLE garden_items;
