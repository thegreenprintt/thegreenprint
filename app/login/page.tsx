"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); return; }
      // Check onboarding
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("onboarding_complete").eq("id", user.id).single();
        if (profile && !profile.onboarding_complete) {
          router.push("/onboarding");
        } else {
          router.push(redirect);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (hasError: boolean) => `w-full bg-surface border ${hasError ? "border-red" : "border-border"} rounded-inp px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors font-sans`;

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <input
          type="email" required placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)}
          className={inputClass(!!error)}
          autoComplete="email"
        />
      </div>
      <div>
        <input
          type="password" required placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          className={inputClass(!!error)}
          autoComplete="current-password"
        />
        {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      </div>
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Signing in…" : "Sign In →"}
      </Button>
      <div className="text-center">
        <button type="button" className="text-xs text-muted hover:text-text transition-colors">
          Forgot password?
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-card p-8">
          <div className="text-center mb-8">
            <div className="w-10 h-10 bg-accent rounded flex items-center justify-center mx-auto mb-4">
              <span className="text-bg font-black text-sm">GP</span>
            </div>
            <h1 className="text-xl font-bold text-text">Sign In</h1>
            <p className="text-xs text-muted mt-1">The Greenprint</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="text-center text-xs text-muted mt-6">
            Don&apos;t have access?{" "}
            <Link href="/join" className="text-accent hover:text-accent/80 transition-colors">
              Get Started →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
