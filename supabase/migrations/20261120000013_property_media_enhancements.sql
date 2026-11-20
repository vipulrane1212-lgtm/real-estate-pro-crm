-- Migration 013: Property Media Enhancements (multiple photos with rooms, multiple videos)

-- Add videos column to properties to store multiple videos with title/room tag/url
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;

-- Add floor_plans column to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS floor_plans jsonb DEFAULT '[]'::jsonb;

-- Comment describing the media structure
COMMENT ON COLUMN public.properties.photos IS 'Array of photos, either string URLs or objects: {"url": string, "room": string, "caption": string}';
COMMENT ON COLUMN public.properties.videos IS 'Array of videos: {"url": string, "room": string, "title": string, "type": "upload"|"youtube"|"vimeo"|"direct"}';
