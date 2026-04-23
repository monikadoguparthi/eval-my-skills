import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock, RotateCcw } from "lucide-react";

export interface Evaluation {
  overall_score: number;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  relevance_score: number;
  speed_score: number;
  average_time_per_question: number;
  completion_status: "completed" | "time_up";
  strengths: string;
  weaknesses: string;
  final_feedback: string;
}

interface Props {
  evaluation: Evaluation;
  totalTimeSeconds: number;
  answeredCount: number;
  totalQuestions: number;
  onRestart: () => void;
}

export default function ResultsScreen({ evaluation, totalTimeSeconds, answeredCount, totalQuestions, onRestart }: Props) {
  const speedVerdict =
    evaluation.speed_score >= 75
      ? { label: "Balanced pace", text: "You maintained a good balance between speed and clarity.", tone: "success" as const }
      : evaluation.average_time_per_question < 30
        ? { label: "Too rushed", text: "Your answers were rushed and lacked clarity.", tone: "warning" as const }
        : { label: "Too slow", text: "You need to improve response speed under time pressure.", tone: "warning" as const };

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <Badge
            variant="outline"
            className={
              evaluation.completion_status === "completed"
                ? "border-[hsl(var(--success))] text-[hsl(var(--success))]"
                : "border-[hsl(var(--warning))] text-[hsl(var(--warning))]"
            }
          >
            {evaluation.completion_status === "completed" ? "Completed" : "Time up"}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mt-3">Interview Results</h1>
          <p className="text-muted-foreground mt-1">
            Answered {answeredCount} of {totalQuestions} questions in {formatTime(totalTimeSeconds)}.
          </p>
        </div>

        {/* Overall score */}
        <Card className="shadow-[var(--shadow-elegant)] border-border/50">
          <CardContent className="p-8 flex flex-col items-center">
            <ScoreRing value={Math.round(evaluation.overall_score)} />
            <div className="text-sm text-muted-foreground mt-4">Overall Score</div>
          </CardContent>
        </Card>

        {/* Sub-scores */}
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <ScoreBar label="Communication" value={evaluation.communication_score} />
            <ScoreBar label="Technical" value={evaluation.technical_score} />
            <ScoreBar label="Confidence" value={evaluation.confidence_score} />
            <ScoreBar label="Relevance" value={evaluation.relevance_score} />
            <ScoreBar label="Speed" value={evaluation.speed_score} />
          </CardContent>
        </Card>

        {/* Time stats */}
        <Card className="border-border/50">
          <CardContent className="p-6 grid grid-cols-3 gap-4 text-center">
            <Stat icon={<Clock className="w-4 h-4" />} label="Total time" value={formatTime(totalTimeSeconds)} />
            <Stat label="Avg / question" value={`${Math.round(evaluation.average_time_per_question)}s`} />
            <Stat label="Answered" value={`${answeredCount} / ${totalQuestions}`} />
          </CardContent>
        </Card>

        {/* Speed verdict */}
        <Card
          className={`border-l-4 ${
            speedVerdict.tone === "success"
              ? "border-l-[hsl(var(--success))] bg-[hsl(var(--success))]/5"
              : "border-l-[hsl(var(--warning))] bg-[hsl(var(--warning))]/5"
          }`}
        >
          <CardContent className="p-5">
            <div className="font-semibold mb-1">{speedVerdict.label}</div>
            <p className="text-sm text-muted-foreground">{speedVerdict.text}</p>
          </CardContent>
        </Card>

        {/* Strengths / Weaknesses */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 text-[hsl(var(--success))] font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{evaluation.strengths}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2 text-[hsl(var(--warning))] font-semibold">
                <AlertTriangle className="w-4 h-4" /> Areas to improve
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{evaluation.weaknesses}</p>
            </CardContent>
          </Card>
        </div>

        {/* Final feedback */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="font-semibold mb-2">Final feedback</div>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{evaluation.final_feedback}</p>
          </CardContent>
        </Card>

        <Button
          onClick={onRestart}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90"
        >
          <RotateCcw className="w-4 h-4" /> Start New Interview
        </Button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">{v}/100</span>
      </div>
      <Progress value={v} className="h-2" />
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} className="stroke-muted" strokeWidth="10" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={r}
          stroke="url(#g)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">/ 100</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}