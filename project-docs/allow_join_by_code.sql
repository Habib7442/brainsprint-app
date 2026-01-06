-- Allow anyone to view any room metadata (this is required to lookup a room by its private Code)
-- The application UI will handle filtering the main list to show only relevant rooms.

DROP POLICY IF EXISTS "Public or Creator View" ON public.rooms;

CREATE POLICY "Universal Read Access" 
ON public.rooms FOR SELECT 
USING (true);
