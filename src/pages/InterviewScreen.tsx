import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface Props {
  sessionId: string;
  questions: string[];
  durationMinutes: number;
  role: string;
  onFinish: (status: "completed" | "time_up") => void;
}

export default function InterviewScreen({ sessionId, questions, durationMinutes, onFinish, role }: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [locked, setLocked] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);

  const { listening, supported, start, stop } = useSpeechRecognition((t) => setAnswer((prev) => (prev ? prev + " " : "") + t.trim()));

  // countdown
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            setLocked(true);
            // submit current draft if any (best-effort) then end
            (async () => {
              if (answer.trim()) {
                await supabase.functions.invoke("submit-answer", {
                  body: {
                    sessionId,
                    questionIndex: index,
                    answer: answer.trim(),
                    timeTaken: Math.round((Date.now() - questionStartRef.current) / 1000),
                  },
                });
              }
              onFinish("time_up");
            })();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset timer for each question
  useEffect(() => {
    questionStartRef.current = Date.now();
    setAnswer("");
    if (listening) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const submit = async () => {
    if (!answer.trim() || submitting || locked) return;
    setSubmitting(true);
    if (listening) stop();
    const timeTaken = Math.round((Date.now() - questionStartRef.current) / 1000);
    try {
      const { error } = await supabase.functions.invoke("submit-answer", {
        body: { sessionId, questionIndex: index, answer: answer.trim(), timeTaken },
      });
      if (error) throw error;
      toast.success("Answer submitted successfully");
      if (index + 1 >= questions.length) {
        finishedRef.current = true;
        setLocked(true);
        onFinish("completed");
      } else {
        setIndex(index + 1);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerColor =
    secondsLeft <= 60
      ? "text-destructive"
      : secondsLeft <= 300
        ? "text-[hsl(var(--warning))]"
        : "text-foreground";

  const progress = useMemo(() => ((index) / questions.length) * 100, [index, questions.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-muted-foreground">{role}</div>
            <div className="text-sm font-semibold">
              Question {index + 1} / {questions.length}
            </div>
          </div>
          <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${timerColor}`}>
            <Clock className="w-5 h-5" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <Card key={index} className="shadow-[var(--shadow-elegant)] border-border/50 animate-in fade-in duration-300">
          <CardContent className="p-8 space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                Question {index + 1}
              </div>
              <h2 className="text-2xl font-semibold leading-snug">{questions[index]}</h2>
            </div>

            <div className="space-y-2">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here, or use the microphone…"
                disabled={locked}
                className="min-h-[200px] text-base leading-relaxed resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{answer.trim().length} characters</span>
                {!supported && <span>Speech recognition not supported in this browser</span>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => (listening ? stop() : start())}
                disabled={!supported || locked}
                className="flex-1"
                title={!supported ? "Speech recognition is not supported in this browser" : ""}
              >
                {listening ? (
                  <>
                    <MicOff className="w-4 h-4" /> Stop Speaking
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> Start Speaking
                  </>
                )}
              </Button>
              <Button
                onClick={submit}
                disabled={!answer.trim() || submitting || locked}
                className="flex-1 bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                  </>
                ) : index + 1 === questions.length ? (
                  "Submit & Finish"
                ) : (
                  "Submit & Next"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You cannot return to previous questions. Click submit when you are done.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}