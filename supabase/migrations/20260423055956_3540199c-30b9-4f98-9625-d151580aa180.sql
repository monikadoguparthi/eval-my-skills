
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  completion_status TEXT,
  evaluation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interview_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_index)
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read sessions" ON public.interview_sessions FOR SELECT USING (true);
CREATE POLICY "Public can insert sessions" ON public.interview_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update sessions" ON public.interview_sessions FOR UPDATE USING (true);

CREATE POLICY "Public can read answers" ON public.interview_answers FOR SELECT USING (true);
CREATE POLICY "Public can insert answers" ON public.interview_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update answers" ON public.interview_answers FOR UPDATE USING (true);
