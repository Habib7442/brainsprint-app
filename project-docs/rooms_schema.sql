-- ROOMS: Stores the rooms created by users
CREATE TABLE IF NOT EXISTS public.rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT true,
    code text UNIQUE, -- 6-digit code for private rooms
    status text DEFAULT 'waiting', -- 'waiting', 'active', 'ended'
    created_at timestamptz DEFAULT now()
);

-- ROOM PARTICIPANTS: Who is in the room
CREATE TABLE IF NOT EXISTS public.room_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    score int DEFAULT 0,
    status text DEFAULT 'joined', -- 'joined', 'completed'
    joined_at timestamptz DEFAULT now(),
    
    UNIQUE(room_id, user_id)
);

-- ROOM QUIZZES: The content for the room
-- We store questions in a JSONB column for flexibility (AI, Manual, PDF-parsed)
CREATE TABLE IF NOT EXISTS public.room_quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
    questions JSONB NOT NULL, -- Array of {question, options, answer}
    created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_rooms_public ON public.rooms(is_public, status);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_participants_room ON public.room_participants(room_id);

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_quizzes ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- Rooms: Everyone can view public rooms. Everyone can view a room they are in.
CREATE POLICY "Public rooms are viewable by everyone" 
ON public.rooms FOR SELECT 
USING (is_public = true OR auth.uid() = creator_id OR EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = public.rooms.id AND user_id = auth.uid()
));

CREATE POLICY "Users can create rooms" 
ON public.rooms FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their rooms" 
ON public.rooms FOR UPDATE 
USING (auth.uid() = creator_id);

-- Quizzes: Visible to participants
CREATE POLICY "Participants can view quizzes" 
ON public.room_quizzes FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.room_participants 
    WHERE room_id = public.room_quizzes.room_id AND user_id = auth.uid()
) OR EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = public.room_quizzes.room_id AND creator_id = auth.uid()
));

CREATE POLICY "Creators can insert quizzes" 
ON public.room_quizzes FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id AND creator_id = auth.uid()
));

-- Participants: 
CREATE POLICY "Users can join rooms" 
ON public.room_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view participants in their room" 
ON public.room_participants FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = room_id AND rp.user_id = auth.uid()
) OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_id AND r.creator_id = auth.uid()
));

CREATE POLICY "Users can update their own score/status" 
ON public.room_participants FOR UPDATE 
USING (auth.uid() = user_id);
