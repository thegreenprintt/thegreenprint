"use client";

import { useState } from "react";

export default function OnboardPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const STEPS = [
    {
      n: 1,
      title: "Your Home Base",
      subtitle: "Log in to 1House",
      desc: "1House is where everything lives — the community, the content, and your connection to The Greenprint. Log in and take 5 minutes to explore.",
      buttons: [
        { label: "Open 1House", href: "https://1house.io", color: "green" },
      ],
    },
    {
      n: 2,
      title: "Full Onboarding Video",
      desc: "If you're not getting phone guidance, watch this video.",
      videoId: "NxuaEQge71E",
    },
    {
      n: 3,
      title: "Setup Your Broker",
      desc: "Create your account at GenesisFX.",
    },
    {
      n: 4,
      title: "Download TradeLocker",
      desc: "Install from App Store or Google Play.",
    },
    {
      n: 5,
      title: "Demo Account Setup",
      desc: "Get familiar with the platform in a risk-free environment.",
    },
    {
      n: 6,
      title: "TradeLocker Phone Overview",
      desc: "Master TradeLocker platform setup and trading execution.",
      videoId: "1ttR4HGQ4Jk",
    },
    {
      n: 7,
      title: "Join Our Community",
      desc: "Connect with other traders and stay updated.",
    },
    {
      n: 8,
      title: "Start Trading",
      desc: "You're ready! Begin your trading journey.",
    },
  ];

  const step = STEPS[currentStep];

  return (
    <div style={{ background: "black", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <div style={{ maxWidth: "900px", width: "100%" }}>
        <div style={{ marginBottom: "20px", color: "#888", fontSize: "14px" }}>STEP {step.n} OF 8</div>
        
        {step.subtitle && <div style={{ color: "#00FF85", fontSize: "12px", marginBottom: "10px" }}>{step.subtitle.toUpperCase()}</div>}
        
        <h1 style={{ fontSize: "32px", marginBottom: "20px", fontWeight: "600" }}>{step.title}</h1>
        
        <p style={{ fontSize: "16px", color: "#aaa", marginBottom: "30px" }}>{step.desc}</p>

        {step.videoId && (
          <div style={{ marginBottom: "30px", borderRadius: "8px", overflow: "hidden", aspectRatio: "16/9", background: "#222" }}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${step.videoId}`}
              title="Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        )}

        {step.buttons && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
            {step.buttons.map((btn, i) => (
              
                key={i}
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  textAlign: "center",
                  textDecoration: "none",
                  fontWeight: "500",
                  background: btn.color === "green" ? "#00FF85" : "#333",
                  color: btn.color === "green" ? "black" : "white",
                  border: "1px solid transparent",
                }}
              >
                {btn.label}
              </a>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "40px" }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "1px solid #555",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            style={{
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#00FF85",
              color: "black",
              cursor: "pointer",
              fontWeight: "500",
              marginLeft: "auto",
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
