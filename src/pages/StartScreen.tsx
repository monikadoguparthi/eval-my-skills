import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROLES = [
  "Software Engineer",
  "Data Analyst",
  "UI/UX Designer",
  "Product Manager",
  "Data Scientist",
  "DevOps Engineer",
  "Custom",
];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const DURATIONS = [20, 30, 60];

interface Props {
  onStart: (data: { sessionId: string; questions: string[]; durationMinutes: number; role: string }) => void;
}

export default function StartScreen({ onStart }: Props) {
  const [role, setRole] = useState(ROLES[0]);
  const [customRole, setCustomRole] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const start = async () => {
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> AI-Powered Interview Simulator
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] bg-clip-text text-transparent">
            Real Interview, Real Pressure
          </h1>
          <p className="text-muted-foreground text-lg">
            10 questions. One shot. No skipping, no going back.
          </p>
        </div>

        <Card className="shadow-[var(--shadow-elegant)] border-border/50">
          <CardHeader>
            <CardTitle>Configure your interview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section label="Role">
              <Grid>
                {ROLES.map((r) => (
                  <ChoiceButton key={r} active={role === r} onClick={() => setRole(r)}>
                    {r}
                  </ChoiceButton>
                ))}
              </Grid>
              {role === "Custom" && (
                <Input
                  className="mt-3"
                  placeholder="e.g. Machine Learning Engineer, Marketing Manager…"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              )}
            </Section>

            <Section label="Difficulty">
              <Grid>
                {DIFFICULTIES.map((d) => (
                  <ChoiceButton key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                    {d}
                  </ChoiceButton>
                ))}
              </Grid>
            </Section>

            <Section label="Duration">
              <Grid>
                {DURATIONS.map((d) => (
                  <ChoiceButton key={d} active={duration === d} onClick={() => setDuration(d)}>
                    {d} minutes
                  </ChoiceButton>
                ))}
              </Grid>
            </Section>

            <Button
              onClick={start}
              disabled={loading}
              size="lg"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating questions…
                </>
              ) : (
                "Start Interview"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Once started, the timer cannot be paused. You will not be able to revisit previous questions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-sm font-medium mb-2 text-foreground/80">{label}</div>
    {children}
  </div>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>
);

const ChoiceButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary shadow-sm"
        : "bg-background border-border hover:border-primary/50 hover:bg-accent"
    }`}
  >
    {children}
  </button>
);