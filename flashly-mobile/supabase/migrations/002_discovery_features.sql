-- Create Categories Table
create table if not exists categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  icon text, -- Lucide icon name
  color text, -- Hex color
  description text,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Categories (Public Read Only)
alter table categories enable row level security;

-- Drop policy if exists to avoid error on rerun
drop policy if exists "Categories are viewable by everyone." on categories;
create policy "Categories are viewable by everyone." on categories for select using (true);

-- Update Collections Table
-- (Check if column exists before adding to make it idempotent-ish, though standard SQL will just error if exists, which is fine for migration)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'collections' and column_name = 'category_id') then
        alter table collections add column category_id uuid references categories(id);
    end if;
    
    if not exists (select 1 from information_schema.columns where table_name = 'collections' and column_name = 'downloads_count') then
        alter table collections add column downloads_count integer default 0;
    end if;
end $$;

-- Indexes
create index if not exists idx_collections_category on collections(category_id);
create index if not exists idx_collections_public on collections(is_public) where is_public = true;

-- Seed Categories (Upsert based on slug)
insert into categories (name, slug, icon, color, description, sort_order) values
('Podstawy', 'basics', 'BookOpen', '#3B82F6', 'Idealne na start. Najważniejsze słowa i zwroty.', 1),
('Podróże', 'travel', 'Plane', '#F59E0B', 'Niezbędne w drodze. Lotnisko, hotel, restauracja.', 2),
('Biznes', 'business', 'Briefcase', '#10B981', 'Słownictwo zawodowe. Spotkania, e-maile, negocjacje.', 3),
('Kuchnia', 'food', 'Utensils', '#EF4444', 'Wszystko o jedzeniu. Składniki, dania, zamawianie.', 4),
('Codzienne', 'daily', 'Sun', '#8B5CF6', 'Życie codzienne. Rozmowy o pogodzie, rodzinie i hobby.', 5)
on conflict (slug) do update set 
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  description = excluded.description,
  sort_order = excluded.sort_order;
