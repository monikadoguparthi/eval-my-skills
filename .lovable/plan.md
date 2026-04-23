

# AI Interview Simulator

A strict, realistic interview simulation web app powered by Lovable AI. One question at a time, no skipping, no going back, hard timer, full AI evaluation at the end.

## Stack note
- Frontend: React + Vite + Tailwind (Lovable's stack — equivalent to your HTML/CSS/JS spec, more robust).
- Backend: Lovable Cloud edge functions (serverless equivalent of Node/Express endpoints).
- AI: Lovable AI Gateway (`google/gemini-3-flash-preview`) — no API key setup needed.

## Screens & Flow

### 1. Start Screen
- Role selector: Software Engineer, Data Analyst, UI/UX Designer, Product Manager, Data Scientist, DevOps Engineer.
- Difficulty: Easy / Medium / Hard.
- Duration: 20 / 30 / 60 minutes.
- "Start Interview" button → calls `start-interview` to generate 10 questions up front.

### 2. Interview Screen
- Top bar: live countdown timer (MM:SS) + progress "Question X / 10".
- One question displayed at a time.
- Answer textarea.
- "🎤 Start Speaking" button using browser Web Speech API (SpeechRecognition) — appends transcript to textarea. Toggles to "Stop Speaking" while active.
- "Submit & Next" button:
  - Disabled when textarea is empty.
  - On click: saves answer + time spent on that question, locks it, advances to next question.
- No back navigation. No skip. Previous questions are not re-shown.

### 3. End conditions
- **Early finish** (all 10 submitted before timer): immediately ends, shows "You completed all questions before time. Great pace!" then "Interview completed early. Evaluating your performance..." while evaluation runs.
- **Time up**: timer hits 0 → inputs disabled instantly, shows "Time is up. Evaluating based on completed answers." Unanswered questions are recorded as blank.

### 4. Results Screen
Renders the strict JSON evaluation:
- Overall score (large circular gauge, 0–100).
- Sub-scores as progress bars: Communication, Technical, Confidence, Relevance, Speed.
- Time stats: total time used, average time/question, completion status badge (`completed` / `time_up`).
- Strengths (green card), Weaknesses (amber card).
- Final feedback paragraph with time-management suggestions.
- Speed verdict line (slow / rushed / balanced) derived from speed_score + avg time.
- "Start New Interview" button.

## Time Tracking
Per-question start timestamp recorded when shown; on submit, `timeTaken` stored. Aggregates: total time used, average time per question, per-question array sent to evaluator.

## Backend (Edge Functions)

1. **`start-interview`** — input: `{ role, difficulty, durationMinutes }`. Calls AI with the question-generation prompt, returns `{ sessionId, questions: string[10], startedAt, durationMinutes }`. Uses tool-calling for clean structured output.

2. **`submit-answer`** — input: `{ sessionId, questionIndex, answer, timeTaken }`. Persists to DB.

3. **`end-interview`** — input: `{ sessionId, completionStatus }`. Loads all answers + timings, calls AI with the evaluation prompt using a strict JSON tool schema matching your output spec exactly, returns the JSON.

## Data (Lovable Cloud DB)
- `interview_sessions`: id, role, difficulty, duration_minutes, questions (jsonb), started_at, ended_at, completion_status, evaluation (jsonb).
- `interview_answers`: id, session_id, question_index, answer, time_taken_seconds.
- Public access (no auth) — sessions identified by generated id stored client-side; RLS permissive for this MVP.

## AI Prompts (used verbatim, with variables interpolated)
- Question generation: your exact prompt.
- Final evaluation: your exact prompt + structured tool schema enforcing the JSON shape:
  `overall_score, communication_score, technical_score, confidence_score, relevance_score, speed_score, average_time_per_question, completion_status, strengths, weaknesses, final_feedback`.

## UX Details
- Clean modern UI: neutral background, single focused card, generous spacing, subtle fade transition between questions.
- Toast on submit: "Answer submitted successfully".
- Timer turns amber under 5 min, red under 1 min.
- Speech recognition gracefully degrades with a tooltip if browser unsupported (Safari/Firefox).
- All buttons disabled and textarea read-only once interview ends.

## Out of scope (MVP)
- User accounts / history of past interviews.
- Voice playback of questions (TTS).
- Multi-language support.

These can be added later if you want.

