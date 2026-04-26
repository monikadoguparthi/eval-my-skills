import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Code2, BarChart3, Palette, Briefcase, Database, Server, Wand2, Check, Clock, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const ROLES = [
  { id: "Software Engineer", icon: Code2 },
  { id: "Data Analyst", icon: BarChart3 },
  { id: "UI/UX Designer", icon: Palette },
  { id: "Product Manager", icon: Briefcase },
  { id: "Data Scientist", icon: Database },
  { id: "DevOps Engineer", icon: Server },
  { id: "Custom", icon: Wand2 },
];

const DIFFICULTIES = [
  { id: "Easy", desc: "Warm-up questions" },
  { id: "Medium", desc: "Real-world scenarios" },
  { id: "Hard", desc: "Senior-level depth" },
];

const DURATIONS = [20, 30, 60];

interface Props {
  onStart: (data: { sessionId: string; questions: string[]; durationMinutes: number; role: string }) => void;
}

export default function StartScreen({ onStart }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState(ROLES[0].id);
  const [customRole, setCustomRole] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!user) {
      nav("/auth");
      return;
    }
    const finalRole = role === "Custom" ? customRole.trim() : role;
    if (!finalRole) {
      toast.error("Please enter a role");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("start-interview", {
        body: { role: finalRole, difficulty, durationMinutes: duration },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onStart({ sessionId: data.sessionId, questions: data.questions, durationMinutes: data.durationMinutes, role: finalRole });
    } catch (e: any) {
      toast.error(e.message || "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" /> AI-powered mock interviews
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Practice with intent.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Realistic interview pressure, instant AI feedback, measurable progress.
          </p>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-soft)] rounded-2xl">
          <div className="p-6 md:p-8 space-y-8">
            <Section label="Choose a role" sub="What position are you preparing for?">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ROLES.map((r) => {
                  const active = role === r.id;
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-sm font-medium">{r.id}</div>
                      {active && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {role === "Custom" && (
                <Input
                  className="mt-3"
                  placeholder="e.g. Machine Learning Engineer, Marketing Manager…"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              )}
            </Section>

            <Section label="Difficulty" sub="How challenging should the questions be?">
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Gauge className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{d.id}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{d.desc}</div>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section label="Duration" sub="How long do you have?">
              <div className="grid grid-cols-3 gap-3">
                {DURATIONS.map((d) => {
                  const active = duration === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{d} minutes</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Button
              onClick={start}
              disabled={loading}
              size="lg"
              className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating questions…</>
              ) : user ? (
                "Start Interview"
              ) : (
                "Sign in to start"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Once started, the timer can't be paused. You can't revisit previous questions.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}

const Section = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-3">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
    {children}
  </div>
);
