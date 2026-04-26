-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Update timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to interview tables
ALTER TABLE public.interview_sessions ADD COLUMN user_id UUID;
ALTER TABLE public.interview_answers ADD COLUMN user_id UUID;

-- Tighten RLS: drop old public policies and replace with user-scoped ones
DROP POLICY IF EXISTS "Public can insert sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public can read sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Public can update sessions" ON public.interview_sessions;

CREATE POLICY "Users can read own sessions"
ON public.interview_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.interview_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.interview_sessions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can insert answers" ON public.interview_answers;
DROP POLICY IF EXISTS "Public can read answers" ON public.interview_answers;
DROP POLICY IF EXISTS "Public can update answers" ON public.interview_answers;

CREATE POLICY "Users can read own answers"
ON public.interview_answers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
ON public.interview_answers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
ON public.interview_answers FOR UPDATE
USING (auth.uid() = user_id);