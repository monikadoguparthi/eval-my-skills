import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock, RotateCcw, MessageSquare, Brain, Target, Zap, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";

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
  const avg = evaluation.average_time_per_question;
  const speedVerdict =
    evaluation.speed_score >= 70 && avg >= 25 && avg <= 90
      ? { label: "Balanced pace", text: "Good balance between speed and clarity.", tone: "success" as const }
      : avg < 25
        ? { label: "A bit rushed", text: "Your responses were rushed and could use more depth.", tone: "warning" as const }
        : { label: "Pace can improve", text: "Try improving your response speed under time constraints.", tone: "warning" as const };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="text-center">
          <Badge variant="outline" className={
            evaluation.completion_status === "completed"
              ? "border-[hsl(var(--success))] text-[hsl(var(--success))]"
              : "border-[hsl(var(--warning))] text-[hsl(var(--warning))]"
          }>
            {evaluation.completion_status === "completed" ? "Completed" : "Time up"}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-3">Your Interview Report</h1>
          <p className="text-muted-foreground mt-1.5">
            Answered {answeredCount} of {totalQuestions} questions in {formatTime(totalTimeSeconds)}.
          </p>
        </div>

        {/* Overall + stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-1 p-6 flex flex-col items-center justify-center border-border/60 rounded-2xl shadow-[var(--shadow-soft)]">
            <ScoreRing value={Math.round(evaluation.overall_score)} />
            <div className="text-sm text-muted-foreground mt-3 font-medium">Overall Score</div>
          </Card>
          <Card className="md:col-span-2 p-6 border-border/60 rounded-2xl shadow-[var(--shadow-soft)] grid grid-cols-3 gap-4">
            <Stat icon={<Clock className="w-4 h-4" />} label="Total time" value={formatTime(totalTimeSeconds)} />
            <Stat icon={<Zap className="w-4 h-4" />} label="Avg / question" value={`${Math.round(avg)}s`} />
            <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="Answered" value={`${answeredCount}/${totalQuestions}`} />
          </Card>
        </div>

        {/* Sub-scores */}
        <Card className="p-6 border-border/60 rounded-2xl shadow-[var(--shadow-soft)] space-y-4">
          <div className="text-sm font-semibold mb-1">Performance breakdown</div>
          <ScoreBar label="Communication" value={evaluation.communication_score} icon={<MessageSquare className="w-3.5 h-3.5" />} />
          <ScoreBar label="Technical" value={evaluation.technical_score} icon={<Brain className="w-3.5 h-3.5" />} />
          <ScoreBar label="Confidence" value={evaluation.confidence_score} icon={<Sparkles className="w-3.5 h-3.5" />} />
          <ScoreBar label="Relevance" value={evaluation.relevance_score} icon={<Target className="w-3.5 h-3.5" />} />
          <ScoreBar label="Speed" value={evaluation.speed_score} icon={<Zap className="w-3.5 h-3.5" />} />
        </Card>

        {/* Speed verdict */}
        <Card className={`p-5 rounded-2xl border-l-4 ${
          speedVerdict.tone === "success"
            ? "border-l-[hsl(var(--success))] bg-[hsl(var(--success))]/5"
            : "border-l-[hsl(var(--warning))] bg-[hsl(var(--warning))]/5"
        }`}>
          <div className="font-semibold mb-1">{speedVerdict.label}</div>
          <p className="text-sm text-muted-foreground">{speedVerdict.text}</p>
        </Card>

        {/* Strengths / weaknesses */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5 rounded-2xl border-l-4 border-l-[hsl(var(--success))]">
            <div className="flex items-center gap-2 mb-2 text-[hsl(var(--success))] font-semibold">
              <CheckCircle2 className="w-4 h-4" /> What you did well
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{evaluation.strengths}</p>
          </Card>
          <Card className="p-5 rounded-2xl border-l-4 border-l-[hsl(var(--warning))]">
            <div className="flex items-center gap-2 mb-2 text-[hsl(var(--warning))] font-semibold">
              <AlertTriangle className="w-4 h-4" /> Where to grow
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{evaluation.weaknesses}</p>
          </Card>
        </div>

        <Card className="p-6 border-border/60 rounded-2xl shadow-[var(--shadow-soft)]">
          <div className="font-semibold mb-2">Coach's note</div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{evaluation.final_feedback}</p>
        </Card>

        <Button
          onClick={onRestart}
          size="lg"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Start new interview
        </Button>
      </main>
    </div>
  );
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  const v = Math.round(value);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium flex items-center gap-1.5 text-foreground/80">{icon} {label}</span>
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
        <circle cx="70" cy="70" r={r} stroke="url(#g)" strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
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
    <div className="text-center">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">{icon} {label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
