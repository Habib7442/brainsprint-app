-- EMERGENCY FIX: DISABLE AND RE-ENABLE RLS TO CLEAR CACHE/STATE
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants DISABLE ROW LEVEL SECURITY;

-- DROP ALL POLICIES FOR THESE TABLES
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Creators can update their rooms" ON public.rooms;
DROP POLICY IF EXISTS "View Rooms Non Recursive" ON public.rooms;
DROP POLICY IF EXISTS "View Rooms Safe" ON public.rooms;

DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can view participants in their room" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own score/status" ON public.room_participants;
DROP POLICY IF EXISTS "View Participants" ON public.room_participants;
DROP POLICY IF EXISTS "View Participants Safe" ON public.room_participants;

-- RE-ENABLE RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- CREATE ABSOLUTELY MINIMAL POLICIES (No recursion possible)

-- 1. Rooms: Check ONLY attributes on the row itself
CREATE POLICY "Select Rooms" 
ON public.rooms FOR SELECT 
USING (
   is_public = true 
   OR 
   creator_id = auth.uid()
);

CREATE POLICY "Insert Rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Update Rooms" ON public.rooms FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Delete Rooms" ON public.rooms FOR DELETE USING (auth.uid() = creator_id);

-- 2. Participants: Check ONLY attributes on the row itself (if possible)
-- If we need to check room ownership, we strictly query the ROOMS table, NOT room_participants again.
CREATE POLICY "Select Participants" 
ON public.room_participants FOR SELECT 
USING (
   user_id = auth.uid()
   OR 
   EXISTS (
       SELECT 1 FROM public.rooms 
       WHERE id = room_id AND creator_id = auth.uid()
   )
);

CREATE POLICY "Insert Participants" ON public.room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update Participants" ON public.room_participants FOR UPDATE USING (auth.uid() = user_id);
