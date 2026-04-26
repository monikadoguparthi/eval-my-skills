import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Invalid email" }).max(255);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" }).max(72);

export default function AuthPage() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const redirectTarget = loc.state?.from?.pathname || "/";

  useEffect(() => {
    if (!loading && user) nav(redirectTarget, { replace: true });
  }, [user, loading, nav, redirectTarget]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
    } catch (e: any) {
      toast.error(e.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  const handleEmail = async (mode: "signin" | "signup") => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (e: any) {
      toast.error(e.errors?.[0]?.message || "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() || undefined },
          },
        });
        if (error) throw error;
        toast.success("Welcome! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (e: any) {
      const msg = e.message?.includes("Invalid login") ? "Invalid email or password" : e.message;
      toast.error(msg || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center mb-4 shadow-[var(--shadow-elegant)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to HireSense AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Turn practice into performance.</p>
        </div>

        <Card className="border-border/60 shadow-[var(--shadow-soft)]">
          <CardContent className="p-6">
            <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full h-11 font-medium">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-4 mt-5">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button onClick={() => handleEmail("signin")} disabled={busy} className="w-full h-11">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4 mt-5">
                <div className="space-y-2">
                  <Label>Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                </div>
                <Button onClick={() => handleEmail("signup")} disabled={busy} className="w-full h-11">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
