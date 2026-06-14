"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHECKS = [
  "Account created",
  "Scanner access granted",
  "Telegram invite sent",
  "Welcome email delivered",
];

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("there");
  const [visibleChecks, setVisibleChecks] = useState(0);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("name").eq("id", user.id).single();
        if (data?.name) setName(data.name.split(" ")[0]);
      }
    })();

    // Stagger checks
    CHECKS.forEach((_, i) => {
      setTimeout(() => setVisibleChecks(i + 1), 1500 + i * 300);
    });
    setTimeout(() => setShowBtn(true), 1500 + CHECKS.length * 300 + 200);
  }, []);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo pulse */}
        <div className="w-14 h-14 bg-accent rounded-card flex items-center justify-center mx-auto mb-10">
          <span className="text-bg font-black text-xl">GP</span>
        </div>

        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted mb-3">
          Access Granted
        </p>
        <h1 className="text-5xl font-black text-text mb-3">
          You&apos;re in.
        </h1>
        <p className="text-muted mb-12">
          Welcome to The Greenprint, {name}.
        </p>

        {/* Checklist */}
        <div className="space-y-3 mb-10 text-left">
          {CHECKS.map((check, i) => (
            <div key={check}>
              {i < visibleChecks && (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-text">{check}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <>
          {showBtn && (
            <div>
              <button
                onClick={() => router.push("/onboarding")}
                className="w-full bg-accent text-bg font-bold py-3.5 rounded-btn text-sm btn-accent transition-all"
              >
                Enter The Platform →
              </button>
              <p className="text-[11px] text-muted mt-4">
                Check your email for login details and your Telegram invite.
              </p>
            </div>
          )}
        </>
      </div>
    </div>
  );
}
