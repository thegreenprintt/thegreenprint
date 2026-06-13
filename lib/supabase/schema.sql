-- Run this in your Supabase SQL editor

-- Enable RLS on all tables

CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE NOT NULL,
  name                TEXT,
  tier                TEXT CHECK (tier IN ('member','trader','elite')) DEFAULT 'member',
  scanner_access      BOOLEAN DEFAULT false,
  app_access          BOOLEAN DEFAULT true,
  telegram_invited    BOOLEAN DEFAULT false,
  whop_member_id      TEXT,
  onboarding_complete BOOLEAN DEFAULT false,
  focus_areas         TEXT[],
  experience_level    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  cancelled_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker        TEXT NOT NULL,
  signal_type   TEXT CHECK (signal_type IN ('BREAKOUT','MOMENTUM','REVERSAL','SETUP')),
  direction     TEXT CHECK (direction IN ('bullish','bearish')),
  price         NUMERIC,
  change_percent NUMERIC,
  volume_level  TEXT CHECK (volume_level IN ('HI','MD','LO')),
  message       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  is_active     BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.watchlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT NOT NULL,
  notes       TEXT,
  date        DATE DEFAULT CURRENT_DATE,
  created_by  TEXT DEFAULT 'jay',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  scheduled_at TIMESTAMPTZ,
  stream_url   TEXT,
  is_live      BOOLEAN DEFAULT false,
  tier_required TEXT CHECK (tier_required IN ('member','trader','elite')) DEFAULT 'member',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role full access users" ON public.users
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read alerts" ON public.alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read watchlist" ON public.watchlist
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sessions" ON public.sessions
  FOR SELECT TO authenticated USING (true);
