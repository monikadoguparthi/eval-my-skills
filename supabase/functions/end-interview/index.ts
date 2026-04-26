// Edge function: evaluates the full interview using Lovable AI and returns strict JSON.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, completionStatus } = await req.json();
    if (!sessionId || !completionStatus) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session, error: sErr } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    if (sErr || !session) throw new Error("Session not found");

    const { data: answers, error: aErr } = await supabase
      .from("interview_answers")
      .select("*")
      .eq("session_id", sessionId)
      .order("question_index");
    if (aErr) throw aErr;

    const questions: string[] = session.questions ?? [];
    const qaPairs = questions.map((q, i) => {
      const a = answers?.find((x) => x.question_index === i);
      return {
        question_index: i + 1,
        question: q,
        answer: a?.answer || "(no answer provided)",
        time_taken_seconds: a?.time_taken_seconds ?? 0,
      };
    });

    const totalTime = qaPairs.reduce((sum, p) => sum + p.time_taken_seconds, 0);
    const answeredCount = qaPairs.filter((p) => p.answer !== "(no answer provided)").length;
    const avgTime = answeredCount > 0 ? totalTime / answeredCount : 0;

    const userPrompt = `You are a supportive but honest interview coach evaluating a full mock interview.

Role: ${session.role}
Difficulty: ${session.difficulty}
Allotted duration: ${session.duration_minutes} minutes
Completion status: ${completionStatus}
Total time used (seconds): ${totalTime}
Average time per answered question (seconds): ${avgTime.toFixed(1)}
Questions answered: ${answeredCount} / ${questions.length}

Interview transcript (JSON):
${JSON.stringify(qaPairs, null, 2)}

Score the candidate (0-100) on: communication, technical depth, confidence, relevance, and speed.

Scoring rules:
- Penalize answers shorter than 20 characters as low effort.
- If average answer time per question is under 25 seconds AND answers are short, treat that as rushed (lower speed score).
- If average answer time is consistently very high relative to allotted time, lower speed score for poor time management.
- Reward structured answers with concrete examples or numbers.
- Empty / missing answers count as 0 for that question.

Tone rules — VERY IMPORTANT:
- Use constructive, human, encouraging language. Like a coach helping the candidate improve.
- DO NOT use harsh or dismissive phrases like "zero technical knowledge", "no hiring would occur", "terrible", "useless", "you failed".
- Replace harsh judgments with actionable suggestions, e.g. "Your answers could benefit from more technical depth", "Try structuring responses with concrete examples", "You answered quickly, but clarity can be improved".
- Speak directly to the candidate using "you" / "your".
- Strengths: 1-3 sentences, specific to what they actually did well (or potential you saw).
- Weaknesses: 1-3 sentences, framed as growth areas with specific tips.
- Final feedback: 3-5 sentences, motivating, with 1-2 concrete next steps.

Speed feedback wording:
- If rushed: "Your responses were rushed and lacked clarity."
- If too slow: "Try improving response speed under time constraints."
- If balanced: "Good balance between speed and clarity."

Return strictly using the provided tool.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a strict expert interviewer." },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_evaluation",
              description: "Return the complete interview evaluation.",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number" },
                  communication_score: { type: "number" },
                  technical_score: { type: "number" },
                  confidence_score: { type: "number" },
                  relevance_score: { type: "number" },
                  speed_score: { type: "number" },
                  average_time_per_question: { type: "number" },
                  completion_status: { type: "string", enum: ["completed", "time_up"] },
                  strengths: { type: "string" },
                  weaknesses: { type: "string" },
                  final_feedback: { type: "string" },
                },
                required: [
                  "overall_score",
                  "communication_score",
                  "technical_score",
                  "confidence_score",
                  "relevance_score",
                  "speed_score",
                  "average_time_per_question",
                  "completion_status",
                  "strengths",
                  "weaknesses",
                  "final_feedback",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_evaluation" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429)
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiResp.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No evaluation returned");
    const evaluation = JSON.parse(toolCall.function.arguments);

    await supabase
      .from("interview_sessions")
      .update({
        ended_at: new Date().toISOString(),
        completion_status: completionStatus,
        evaluation,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ evaluation, totalTimeSeconds: totalTime, answeredCount, totalQuestions: questions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("end-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});