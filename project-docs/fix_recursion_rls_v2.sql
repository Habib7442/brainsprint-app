-- Drop recursive policies if they exist to avoid infinite recursion
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Users can view participants in their room" ON public.room_participants;

-- 1. Simple Room Policy:
-- Allow viewing if Public OR Creator
-- NOTE: We removed the participant check on the room itself to break recursion for now. 
-- For the main list, we mostly care about Public or Created.
CREATE POLICY "View Rooms Non Recursive" 
ON public.rooms FOR SELECT 
USING (
    is_public = true 
    OR creator_id = auth.uid()
);

-- 2. Simple Participant Policy:
-- Allow viewing if in the same room (but avoid querying room_participants -> rooms -> room_participants loop).
-- We can allow users to see participants if they are in the participant table for that room.
CREATE POLICY "View Participants" 
ON public.room_participants FOR SELECT 
USING (
    user_id = auth.uid() -- I can see myself
    OR 
    EXISTS ( -- I can see others in rooms I am in
        SELECT 1 FROM public.room_participants rp_check
        WHERE rp_check.room_id = room_id AND rp_check.user_id = auth.uid()
    )
    OR 
    EXISTS ( -- I can see participants if I created the room
        SELECT 1 FROM public.rooms r
        WHERE r.id = room_id AND r.creator_id = auth.uid()
    )
);
