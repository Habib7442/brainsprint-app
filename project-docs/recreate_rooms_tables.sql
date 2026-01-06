-- 1. DROP EVERYTHING
DROP POLICY IF EXISTS "Select Participants" ON public.room_participants;
DROP POLICY IF EXISTS "Insert Participants" ON public.room_participants;
DROP POLICY IF EXISTS "Update Participants" ON public.room_participants;

DROP TABLE IF EXISTS public.room_participants CASCADE;
DROP TABLE IF EXISTS public.room_quizzes CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- 2. RECREATE TABLES 
CREATE TABLE public.rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    subject text,
    is_public boolean DEFAULT true,
    code text UNIQUE, 
    status text DEFAULT 'waiting', 
    created_at timestamptz DEFAULT now(),
    cover_image_url text
);

CREATE TABLE public.room_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    score int DEFAULT 0,
    status text DEFAULT 'joined', 
    joined_at timestamptz DEFAULT now(),
    UNIQUE(room_id, user_id)
);

CREATE TABLE public.room_quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
    questions JSONB NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. ENABLE RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_quizzes ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SIMPLE POLICIES (No Self-Referencing Recursion)

-- ROOMS: Public or Created by Me
CREATE POLICY "Public or Creator View" 
ON public.rooms FOR SELECT 
USING (
    is_public = true 
    OR creator_id = auth.uid()
);

CREATE POLICY "Creator Insert" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator Update" ON public.rooms FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creator Delete" ON public.rooms FOR DELETE USING (auth.uid() = creator_id);

-- PARTICIPANTS: My Entry or Room Owner
-- (This requires joining Rooms, but Rooms does NOT join Participants, so cycle is broken)
CREATE POLICY "Participant View" 
ON public.room_participants FOR SELECT 
USING (
    user_id = auth.uid()
    OR 
    EXISTS (
        SELECT 1 FROM public.rooms 
        WHERE id = room_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Participant Join" ON public.room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Participant Update" ON public.room_participants FOR UPDATE USING (auth.uid() = user_id);

-- QUIZZES: Participants or Room Owner
CREATE POLICY "Quiz View" 
ON public.room_quizzes FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.room_participants 
        WHERE room_id = public.room_quizzes.room_id AND user_id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.rooms 
        WHERE id = public.room_quizzes.room_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "Creator Quiz Insert" ON public.room_quizzes FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.rooms 
        WHERE id = room_id AND creator_id = auth.uid()
    )
);
