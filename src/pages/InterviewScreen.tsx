import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import Navbar from "@/components/Navbar";

const MIN_ANSWER_LENGTH = 10;

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
  const [interim, setInterim] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [locked, setLocked] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);

  const { listening, supported, error: srError, start, stop } = useSpeechRecognition(
    (t) => setAnswer((prev) => (prev ? prev + " " : "") + t.trim()),
    (t) => setInterim(t),
    3000,
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            setLocked(true);
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

  useEffect(() => {
    questionStartRef.current = Date.now();
    setAnswer("");
    setInterim("");
    if (listening) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const submit = async () => {
    const trimmed = answer.trim();
    if (trimmed.length < MIN_ANSWER_LENGTH || submitting || locked) return;
    setSubmitting(true);
    if (listening) stop();
    const timeTaken = Math.round((Date.now() - questionStartRef.current) / 1000);
    try {
      const { error } = await supabase.functions.invoke("submit-answer", {
        body: { sessionId, questionIndex: index, answer: trimmed, timeTaken },
      });
      if (error) throw error;
      toast.success("Answer submitted");
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
  const trimmedLen = answer.trim().length;
  const tooShort = trimmedLen > 0 && trimmedLen < MIN_ANSWER_LENGTH;
  const canSubmit = trimmedLen >= MIN_ANSWER_LENGTH && !submitting && !locked;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Progress + timer bar */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-xs font-medium text-muted-foreground truncate">{role}</div>
            <div className="text-xs font-semibold text-foreground whitespace-nowrap">
              Question {index + 1} of {questions.length}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold ${timerColor}`}>
            <Clock className="w-4 h-4" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <Card key={index} className="border-border/60 shadow-[var(--shadow-soft)] rounded-2xl animate-in fade-in duration-300">
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                Question {index + 1}
              </div>
              <h2 className="text-2xl md:text-[26px] font-semibold leading-snug tracking-tight">{questions[index]}</h2>
            </div>

            <div className="space-y-2">
              <Textarea
                value={interim ? (answer ? answer + " " + interim : interim) : answer}
                onChange={(e) => {
                  setInterim("");
                  setAnswer(e.target.value);
                }}
                placeholder="Type your answer here, or use the microphone…"
                disabled={locked}
                className="min-h-[200px] text-base leading-relaxed resize-none rounded-xl"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={tooShort ? "text-destructive" : ""}>
                  {trimmedLen} characters{tooShort ? ` — minimum ${MIN_ANSWER_LENGTH}` : ""}
                </span>
                {listening ? (
                  <span className="flex items-center gap-2 text-destructive font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                    </span>
                    Listening…
                  </span>
                ) : !supported ? (
                  <span>Voice input not supported in this browser.</span>
                ) : srError ? (
                  <span className="text-destructive">{srError}</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => (listening ? stop() : start())}
                disabled={!supported || locked}
                className="flex-1 h-11 rounded-xl"
                title={!supported ? "Voice input not supported" : ""}
              >
                {listening ? (
                  <><MicOff className="w-4 h-4 mr-2" /> Stop</>
                ) : (
                  <><Mic className="w-4 h-4 mr-2" /> Start Speaking</>
                )}
              </Button>
              <Button
                onClick={submit}
                disabled={!canSubmit}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
                ) : index + 1 === questions.length ? (
                  "Submit & Finish"
                ) : (
                  "Submit & Next"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You can't return to previous questions. Submit when you're done.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
