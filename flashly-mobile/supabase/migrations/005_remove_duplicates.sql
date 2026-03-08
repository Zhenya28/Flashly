
-- 005_remove_duplicates.sql

-- Cleanup duplicate collections based on title and category
-- Keeps the most recently created one (highest id/timestamp usually, or just arbitrary)
DELETE FROM collections a 
USING collections b 
WHERE a.id < b.id 
  AND a.title = b.title 
  AND a.category_id = b.category_id
  AND a.is_public = true; -- Only target public collections
