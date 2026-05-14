-- Migration: 001_initial_schema
-- Description: Schema inicial para el Instagram Scraper + IA Dashboard MVP

-- Tabla de perfiles de Instagram
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_handle text NOT NULL UNIQUE,
  full_name text,
  bio text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  profile_pic_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','scraping','analyzing','completed','error')),
  last_scraped_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de posts de Instagram
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_post_id text NOT NULL UNIQUE,
  caption text,
  image_url text NOT NULL,
  image_storage_path text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  comments_content text[], -- array de strings para análisis de sentimiento
  posted_at timestamp with time zone,

  -- Datos extraídos por IA
  destination text,
  experience_type text CHECK (experience_type IN ('playa','montaña','gastronomía','aventura','cultural','relax','otro')),
  price_estimate text,
  urgency_level text CHECK (urgency_level IN ('low','medium','high')),
  offer_expiry_date date,
  keywords text[],
  summary text,
  sentiment text, -- resultado del análisis de sentimiento de comentarios
  raw_ai_analysis jsonb,

  engagement_score numeric,
  created_at timestamp with time zone DEFAULT now()
);

-- Trigger para calcular engagement_score automáticamente
CREATE OR REPLACE FUNCTION calculate_engagement_score()
RETURNS trigger AS $$
BEGIN
  new.engagement_score := (new.likes_count * 1.0 + new.comments_count * 2.0) /
    GREATEST((SELECT followers_count FROM profiles WHERE id = new.profile_id), 1);
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_engagement_score
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION calculate_engagement_score();

-- Tabla de jobs de scraping
CREATE TABLE scraping_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  total_posts integer,
  processed_posts integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas simples para acceso autenticado (el admin siempre estará autenticado)
CREATE POLICY "Allow all access to authenticated users" ON profiles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all access to authenticated users" ON posts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all access to authenticated users" ON scraping_jobs
  FOR ALL USING (auth.role() = 'authenticated');

-- Índices para optimizar consultas comunes
CREATE INDEX idx_posts_profile_id ON posts(profile_id);
CREATE INDEX idx_posts_posted_at ON posts(posted_at DESC);
CREATE INDEX idx_posts_engagement_score ON posts(engagement_score DESC);
CREATE INDEX idx_posts_destination ON posts(destination);
CREATE INDEX idx_posts_urgency ON posts(urgency_level, offer_expiry_date);
CREATE INDEX idx_posts_experience_type ON posts(experience_type);
CREATE INDEX idx_posts_keywords ON posts USING gin(keywords);
CREATE INDEX idx_scraping_jobs_profile_id ON scraping_jobs(profile_id);
CREATE INDEX idx_profiles_status ON profiles(status);
