-- Add 'uploading' status to reel_status enum
-- This status is used when the assembled video is being uploaded to Supabase storage

ALTER TYPE "reel_status" ADD VALUE 'uploading' BEFORE 'ready';
