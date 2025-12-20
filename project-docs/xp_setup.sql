-- Function to increment XP safely
create or replace function increment_xp(amount int, user_uuid uuid)
returns void as $$
begin
  update public.users
  set 
    total_xp = total_xp + amount,
    current_level = floor((total_xp + amount) / 1000) + 1  -- Simple level formula: 1 level per 1000 XP
  where id = user_uuid;
end;
$$ language plpgsql security definer;
