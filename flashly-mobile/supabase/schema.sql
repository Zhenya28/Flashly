-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Categories for Discovery
create table categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  icon text, -- Lucide icon name
  color text, -- Hex color
  description text,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Categories
alter table categories enable row level security;
create policy "Categories are viewable by everyone." on categories for select using (true);

-- Collections (Decks)
create table collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  source_lang text not null, -- e.g. 'DE', 'ES'
  target_lang text not null, -- e.g. 'PL', 'EN'
  is_public boolean default false,
  category_id uuid references categories(id),
  downloads_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Collections
alter table collections enable row level security;
create policy "Users can view own collections." on collections for select using (auth.uid() = user_id);
create policy "Users can insert own collections." on collections for insert with check (auth.uid() = user_id);
create policy "Users can update own collections." on collections for update using (auth.uid() = user_id);
create policy "Users can delete own collections." on collections for delete using (auth.uid() = user_id);


-- Flashcards
create table flashcards (
  id uuid default uuid_generate_v4() primary key,
  collection_id uuid references collections(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  front text not null,
  back text not null,
  image_url text, -- Optional image for the card
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Flashcards
alter table flashcards enable row level security;
create policy "Users can manage own flashcards" on flashcards for all using (auth.uid() = user_id);


-- Study Logs (SM-2 Algorithm State)
-- Tracks the progress of a user on a specific card
create table study_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  flashcard_id uuid references flashcards(id) on delete cascade not null,
  
  -- SM-2 Fields
  box integer default 0, -- 0 to 5 (Leitner system concept, or just tracking stages)
  ease_factor float default 2.5, -- Standard starting ease
  interval integer default 0, -- Days until next review
  
  last_studied_at timestamp with time zone default now(),
  next_review_at timestamp with time zone default now(),
  
  unique(user_id, flashcard_id)
);

-- RLS for Study Logs
alter table study_logs enable row level security;
create policy "Users can manage own study logs" on study_logs for all using (auth.uid() = user_id);

-- Indexes for performance
create index idx_collections_user on collections(user_id);
create index idx_flashcards_collection on flashcards(collection_id);
create index idx_study_logs_next_review on study_logs(user_id, next_review_at);
create index idx_collections_category on collections(category_id);
create index idx_collections_public on collections(is_public) where is_public = true;

