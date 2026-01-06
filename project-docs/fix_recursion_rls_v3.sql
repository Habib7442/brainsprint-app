-- 1. Drop potentially conflicting/recursive policies
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Users can view participants in their room" ON public.room_participants;
DROP POLICY IF EXISTS "View Rooms Non Recursive" ON public.rooms;
DROP POLICY IF EXISTS "View Participants" ON public.room_participants;

-- 2. Define SAFEST Non-Recursive Policies

-- ROOMS: Visible if Public OR Created by Me
-- (Removed the "or I am a participant" check to strictly prevent recursion for now. 
-- You usually find rooms via the list or code)
CREATE POLICY "View Rooms Safe" 
ON public.rooms FOR SELECT 
USING (
    is_public = true 
    OR creator_id = auth.uid()
);

-- PARTICIPANTS: Visible if I am that participant OR I created the room
-- (Removed "if I am in the same room" check because that requires scanning the table itself)
CREATE POLICY "View Participants Safe" 
ON public.room_participants FOR SELECT 
USING (
    user_id = auth.uid() -- I can see my own entry
    OR 
    EXISTS ( -- I can see participants if I own the room
        SELECT 1 FROM public.rooms r
        WHERE r.id = room_id AND r.creator_id = auth.uid()
    )
);

-- 3. Ensure other policies don't conflict (standard inserts/updates are usually fine as they check auth.uid)
