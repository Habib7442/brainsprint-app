-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Users Table
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  
  -- Streak & Progress
  current_streak int default 0,
  longest_streak int default 0,
  last_practice_date date,
  total_xp int default 0,
  current_level int default 1,
  
  -- Premium Status (Default to Free)
  is_premium boolean default false,
  premium_expires_at timestamptz,
  streak_freezes int default 0,
  
  -- Preferences
  preferred_theme text default 'dark',
  notification_enabled boolean default true
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies
create policy "Users can view their own profile" 
  on public.users for select 
  using ( auth.uid() = id );

create policy "Users can update their own profile" 
  on public.users for update 
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
