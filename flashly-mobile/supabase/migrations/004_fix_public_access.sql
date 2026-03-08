
-- 004_fix_public_access.sql

-- 1. Enable access to Public Collections
-- This allows any authenticated user to VIEW (Select) collections marked as public.
drop policy if exists "Public collections are viewable by everyone." on collections;
create policy "Public collections are viewable by everyone." 
on collections for select 
using (is_public = true);

-- 2. Enable access to Flashcards in Public Collections
-- This allows any authenticated user to VIEW flashcards if they belong to a public collection.
-- Vital for the "Clone this collection" feature.
drop policy if exists "Public flashcards are viewable by everyone." on flashcards;
create policy "Public flashcards are viewable by everyone." 
on flashcards for select 
using (
  exists (
    select 1 
    from collections c 
    where c.id = flashcards.collection_id 
    and c.is_public = true
  )
);
