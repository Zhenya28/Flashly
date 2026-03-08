
-- 003_seed_content.sql

-- 1. Insert New Categories (Upsert)
insert into categories (name, slug, icon, color, description, sort_order) values
('Technologia', 'tech', 'Cpu', '#6366F1', 'Programowanie, AI, Hardware.', 6),
('Zdrowie', 'health', 'Heart', '#EC4899', 'Anatomia, medycyna, zdrowy styl życia.', 7),
('Sztuka', 'arts', 'Palette', '#DB2777', 'Malarstwo, muzyka, architektura.', 8),
('Nauka', 'science', 'Atom', '#059669', 'Fizyka, chemia, biologia.', 9)
on conflict (slug) do nothing;

-- 2. Insert Collections & Flashcards using DO block for variable handling
DO $$
DECLARE
    -- Category IDs
    cat_basics uuid;
    cat_travel uuid;
    cat_business uuid;
    cat_food uuid;
    cat_daily uuid;
    cat_tech uuid;
    cat_health uuid;
    cat_arts uuid;
    cat_science uuid;

    -- Collection IDs
    col_id uuid;
    
    -- System User ID (to own the collections)
    system_user_id uuid;
BEGIN
    -- Get the first user (usually the developer/admin) to be the owner
    SELECT id INTO system_user_id FROM auth.users LIMIT 1;

    -- Fallback/Safety check
    IF system_user_id IS NULL THEN
       RAISE EXCEPTION 'No user found in auth.users. Please sign up in the app first so we can assign these collections to a user.';
    END IF;

    -- Get Category IDs
    SELECT id INTO cat_basics FROM categories WHERE slug = 'basics';
    SELECT id INTO cat_travel FROM categories WHERE slug = 'travel';
    SELECT id INTO cat_business FROM categories WHERE slug = 'business';
    SELECT id INTO cat_food FROM categories WHERE slug = 'food';
    SELECT id INTO cat_daily FROM categories WHERE slug = 'daily';
    SELECT id INTO cat_tech FROM categories WHERE slug = 'tech';
    SELECT id INTO cat_health FROM categories WHERE slug = 'health';
    SELECT id INTO cat_arts FROM categories WHERE slug = 'arts';
    SELECT id INTO cat_science FROM categories WHERE slug = 'science';

    ---------------------------------------------------------------------------
    -- CATEGORY: BASICS
    ---------------------------------------------------------------------------
    
    -- Collection: 100 Most Common Words (EN)
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, '100 Najważniejszych Słów', 'Absolutne podstawy języka angielskiego. Musisz to znać.', 'PL', 'EN', true, cat_basics, 1250)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Be', 'Być'),
    (col_id, system_user_id, 'Have', 'Mieć'),
    (col_id, system_user_id, 'Do', 'Robić'),
    (col_id, system_user_id, 'Say', 'Mówić'),
    (col_id, system_user_id, 'Go', 'Iść'),
    (col_id, system_user_id, 'Get', 'Dostać'),
    (col_id, system_user_id, 'Make', 'Robić / Tworzyć'),
    (col_id, system_user_id, 'Know', 'Wiedzieć'),
    (col_id, system_user_id, 'Think', 'Myśleć'),
    (col_id, system_user_id, 'Take', 'Brać');

    -- Collection: Colors & Shapes (ES)
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Kolory i Kształty (Hiszpański)', 'Podstawowe nazwy kolorów i figur geometrycznych.', 'PL', 'ES', true, cat_basics, 340)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Rojo', 'Czerwony'),
    (col_id, system_user_id, 'Azul', 'Niebieski'),
    (col_id, system_user_id, 'Verde', 'Zielony'),
    (col_id, system_user_id, 'Amarillo', 'Żółty'),
    (col_id, system_user_id, 'Negro', 'Czarny'),
    (col_id, system_user_id, 'Blanco', 'Biały'),
    (col_id, system_user_id, 'Círculo', 'Koło'),
    (col_id, system_user_id, 'Cuadrado', 'Kwadrat'),
    (col_id, system_user_id, 'Triángulo', 'Trójkąt');

    ---------------------------------------------------------------------------
    -- CATEGORY: TRAVEL
    ---------------------------------------------------------------------------

    -- Collection: At the Airport
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Na Lotnisku', 'Słownictwo niezbędne podczas odprawy i podróży samolotem.', 'PL', 'EN', true, cat_travel, 890)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Boarding Pass', 'Karta pokładowa'),
    (col_id, system_user_id, 'Gate', 'Bramka'),
    (col_id, system_user_id, 'Luggage', 'Bagaż'),
    (col_id, system_user_id, 'Customs', 'Cło / Odprawa celna'),
    (col_id, system_user_id, 'Flight attendant', 'Stewardessa'),
    (col_id, system_user_id, 'Departure', 'Odlot'),
    (col_id, system_user_id, 'Arrival', 'Przylot'),
    (col_id, system_user_id, 'Delayed', 'Opóźniony'),
    (col_id, system_user_id, 'Seatbelt', 'Pas bezpieczeństwa');

    -- Collection: Hotel Check-in (DE)
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Meldeformular (Hotel)', 'Niemieckie zwroty przydatne w hotelu.', 'PL', 'DE', true, cat_travel, 210)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Die Buchung', 'Rezerwacja'),
    (col_id, system_user_id, 'Der Schlüssel', 'Klucz'),
    (col_id, system_user_id, 'Das Zimmer', 'Pokój'),
    (col_id, system_user_id, 'Das Frühstück', 'Śniadanie'),
    (col_id, system_user_id, 'Auschecken', 'Wymeldować się'),
    (col_id, system_user_id, 'Die Rechnung', 'Rachunek');

    ---------------------------------------------------------------------------
    -- CATEGORY: BUSINESS
    ---------------------------------------------------------------------------

    -- Collection: Business Meetings
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Business Meetings', 'Profesjonalne zwroty na spotkania biznesowe.', 'PL', 'EN', true, cat_business, 1500)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Agenda', 'Plan spotkania'),
    (col_id, system_user_id, 'Proposal', 'Propozycja / Oferta'),
    (col_id, system_user_id, 'Negotiation', 'Negocjacje'),
    (col_id, system_user_id, 'Deadline', 'Termin ostateczny'),
    (col_id, system_user_id, 'Stakeholder', 'Interesariusz'),
    (col_id, system_user_id, 'Brief', 'Streszczenie / Wytyczne'),
    (col_id, system_user_id, 'Feedback', 'Informacja zwrotna'),
    (col_id, system_user_id, 'Budget', 'Budżet');

    ---------------------------------------------------------------------------
    -- CATEGORY: FOOD
    ---------------------------------------------------------------------------

    -- Collection: Italian Cuisine Basics
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Włoskie Smaki', 'Podstawowe produkty i dania kuchni włoskiej.', 'PL', 'IT', true, cat_food, 450)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Il Formaggio', 'Ser'),
    (col_id, system_user_id, 'Il Pane', 'Chleb'),
    (col_id, system_user_id, 'La Pasta', 'Makaron'),
    (col_id, system_user_id, 'Il Vino', 'Wino'),
    (col_id, system_user_id, 'Il Pomodoro', 'Pomidor'),
    (col_id, system_user_id, 'Delizioso', 'Pyszne'),
    (col_id, system_user_id, 'Il Conto', 'Rachunek');

    ---------------------------------------------------------------------------
    -- CATEGORY: TECH (NEW)
    ---------------------------------------------------------------------------

    -- Collection: Programming 101
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Programowanie: Pojęcia', 'Podstawowe terminy dla początkujących programistów.', 'PL', 'EN', true, cat_tech, 3200)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Variable', 'Zmienna'),
    (col_id, system_user_id, 'Function', 'Funkcja'),
    (col_id, system_user_id, 'Loop', 'Pętla'),
    (col_id, system_user_id, 'Array', 'Tablica'),
    (col_id, system_user_id, 'Object', 'Obiekt'),
    (col_id, system_user_id, 'Database', 'Baza danych'),
    (col_id, system_user_id, 'API', 'Interfejs programistyczny'),
    (col_id, system_user_id, 'Framework', 'Szkielet programistyczny'),
    (col_id, system_user_id, 'Bug', 'Błąd w kodzie'),
    (col_id, system_user_id, 'Deployment', 'Wdrożenie');

    -- Collection: AI Revolution
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Rewolucja AI', 'Terminologia związana ze sztuczną inteligencją.', 'PL', 'EN', true, cat_tech, 5600)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Neural Network', 'Sieć neuronowa'),
    (col_id, system_user_id, 'Machine Learning', 'Uczenie maszynowe'),
    (col_id, system_user_id, 'Large Language Model', 'Duży model językowy'),
    (col_id, system_user_id, 'Inference', 'Wnioskowanie'),
    (col_id, system_user_id, 'Latent Space', 'Przestrzeń ukryta'),
    (col_id, system_user_id, 'Tokenizer', 'Tokenizator'),
    (col_id, system_user_id, 'Bias', 'Stronniczość');

    ---------------------------------------------------------------------------
    -- CATEGORY: HEALTH (NEW)
    ---------------------------------------------------------------------------

    -- Collection: Human Anatomy
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Anatomia Człowieka', 'Nazwy organów i części ciała.', 'PL', 'EN', true, cat_health, 670)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Heart', 'Serce'),
    (col_id, system_user_id, 'Lungs', 'Płuca'),
    (col_id, system_user_id, 'Liver', 'Wątroba'),
    (col_id, system_user_id, 'Kidney', 'Nerka'),
    (col_id, system_user_id, 'Stomach', 'Żołądek'),
    (col_id, system_user_id, 'Brain', 'Mózg'),
    (col_id, system_user_id, 'Muscle', 'Mięsień'),
    (col_id, system_user_id, 'Bone', 'Kość');

     ---------------------------------------------------------------------------
    -- CATEGORY: ARTS (NEW)
    ---------------------------------------------------------------------------

    -- Collection: Art Movements
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Kierunki w Sztuce', 'Główne epoki i style w malarstwie.', 'PL', 'EN', true, cat_arts, 220)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Renaissance', 'Renesans'),
    (col_id, system_user_id, 'Baroque', 'Barok'),
    (col_id, system_user_id, 'Impressionism', 'Impresjonizm'),
    (col_id, system_user_id, 'Cubism', 'Kubizm'),
    (col_id, system_user_id, 'Surrealism', 'Surrealizm'),
    (col_id, system_user_id, 'Abstract Expressionism', 'Ekspresjonizm abstrakcyjny'),
    (col_id, system_user_id, 'Pop Art', 'Pop Art');

     ---------------------------------------------------------------------------
    -- CATEGORY: SCIENCE (NEW)
    ---------------------------------------------------------------------------

    -- Collection: Solar System
    INSERT INTO collections (user_id, title, description, source_lang, target_lang, is_public, category_id, downloads_count)
    VALUES (system_user_id, 'Układ Słoneczny', 'Planety i ciała niebieskie.', 'PL', 'EN', true, cat_science, 980)
    RETURNING id INTO col_id;

    INSERT INTO flashcards (collection_id, user_id, front, back) VALUES
    (col_id, system_user_id, 'Sun', 'Słońce'),
    (col_id, system_user_id, 'Moon', 'Księżyc'),
    (col_id, system_user_id, 'Earth', 'Ziemia'),
    (col_id, system_user_id, 'Mars', 'Mars'),
    (col_id, system_user_id, 'Jupiter', 'Jowisz'),
    (col_id, system_user_id, 'Saturn', 'Saturn'),
    (col_id, system_user_id, 'Galaxy', 'Galaktyka'),
    (col_id, system_user_id, 'Black Hole', 'Czarna dziura');

END $$;
