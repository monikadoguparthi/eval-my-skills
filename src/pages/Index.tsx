import { useState } from "react";
import StartScreen from "./StartScreen";
import InterviewScreen from "./InterviewScreen";
import ResultsScreen, { type Evaluation } from "./ResultsScreen";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Phase = "start" | "interview" | "evaluating" | "results";

interface Session {
  sessionId: string;
  questions: string[];
  durationMinutes: number;
  role: string;
}

const Index = () => {
  const [phase, setPhase] = useState<Phase>("start");
  const [session, setSession] = useState<Session | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evalMeta, setEvalMeta] = useState<{ totalTime: number; answered: number; total: number } | null>(null);
  const [evalMessage, setEvalMessage] = useState("");

  const handleStart = (data: Session) => {
    setSession(data);
    setPhase("interview");
  };

  const handleFinish = async (status: "completed" | "time_up") => {
    if (!session) return;
    setEvalMessage(
      status === "completed"
        ? "You completed all questions before time. Great pace! Evaluating your performance…"
        : "Time is up. Evaluating based on completed answers.",
    );
    setPhase("evaluating");
    try {
      const { data, error } = await supabase.functions.invoke("end-interview", {
        body: { sessionId: session.sessionId, completionStatus: status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEvaluation(data.evaluation);
      setEvalMeta({ totalTime: data.totalTimeSeconds, answered: data.answeredCount, total: data.totalQuestions });
      setPhase("results");
    } catch (e: any) {
      toast.error(e.message || "Evaluation failed");
      setPhase("start");
    }
  };

  const restart = () => {
    setSession(null);
    setEvaluation(null);
    setEvalMeta(null);
    setPhase("start");
  };

  if (phase === "start") return <StartScreen onStart={handleStart} />;
  if (phase === "interview" && session)
    return (
      <InterviewScreen
        sessionId={session.sessionId}
        questions={session.questions}
        durationMinutes={session.durationMinutes}
        role={session.role}
        onFinish={handleFinish}
      />
    );
  if (phase === "evaluating")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">{evalMessage.split(".")[0]}.</h2>
        <p className="text-muted-foreground max-w-md">{evalMessage.split(".").slice(1).join(".").trim()}</p>
      </div>
    );
  if (phase === "results" && evaluation && evalMeta)
    return (
      <ResultsScreen
        evaluation={evaluation}
        totalTimeSeconds={evalMeta.totalTime}
        answeredCount={evalMeta.answered}
        totalQuestions={evalMeta.total}
        onRestart={restart}
      />
    );
  return null;
};

export default Index;
