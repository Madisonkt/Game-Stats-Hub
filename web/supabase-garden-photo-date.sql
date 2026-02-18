-- Add photo_taken_at column to garden_items
-- Stores the EXIF DateTimeOriginal from uploaded photos
ALTER TABLE garden_items
  ADD COLUMN IF NOT EXISTS photo_taken_at timestamptz;
