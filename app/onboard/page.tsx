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
      videoId: "dQw4w9WgXcQ",
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
      desc: "Configure your demo trading account.",
    },
    {
      n: 6,
      title: "TradeLocker Overview",
      desc: "Learn the TradeLocker platform.",
      videoId: "jNQXAC9IVRw",
    },
    {
      n: 7,
      title: "Join Community",
      desc: "Connect with other traders at https://t.me/+1rvPMKd6MRw3NGUx",
    },
    {
      n: 8,
      title: "Watch Training",
      desc: "Learn from experienced traders.",
    },
  ];

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-[#00FF85]">STEP {step.n} OF {STEPS.length}</h1>
        <h2 className="text-2xl mb-4">{step.title}</h2>
        {step.subtitle && <p className="text-lg text-gray-300 mb-4">{step.subtitle}</p>}
        <p className="text-gray-300 mb-8">{step.desc}</p>

        {step.videoId && (
          <div className="mb-8 rounded-lg overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9' }}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${step.videoId}`}
              title={step.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="flex justify-between gap-4 mt-8">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-2 text-gray-400 disabled:opacity-50"
          >
            ← Back
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={currentStep === STEPS.length - 1}
            className="px-6 py-3 bg-[#00FF85] text-black font-bold rounded disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
