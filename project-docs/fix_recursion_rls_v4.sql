-- 1. DROP EVERYTHING related to these policies to be absolutely sure
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Users can view participants in their room" ON public.room_participants;
DROP POLICY IF EXISTS "View Rooms Non Recursive" ON public.rooms;
DROP POLICY IF EXISTS "View Participants" ON public.room_participants;
DROP POLICY IF EXISTS "View Rooms Safe" ON public.rooms;
DROP POLICY IF EXISTS "View Participants Safe" ON public.room_participants;

-- 2. RECREATE SAFEST POLICIES

-- ROOMS: Visible if Public OR Created by Me
CREATE POLICY "View Rooms Safe" 
ON public.rooms FOR SELECT 
USING (
    is_public = true 
    OR creator_id = auth.uid()
);

-- PARTICIPANTS: Visible if I am that participant OR I created the room
CREATE POLICY "View Participants Safe" 
ON public.room_participants FOR SELECT 
USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM public.rooms r
        WHERE r.id = room_id AND r.creator_id = auth.uid()
    )
);
