"use client";
import { useState } from "react";

export default function OnboardPage() {
      const [currentStep, setCurrentStep] = useState(0);

  const STEPS = [
      {
                n: 1,
                title: "Your Home Base",
                subtitle: "Log in to 1House",
                desc: "1House is where everything lives – the community, the content, and your connection to The Greenprint. Log in and take 5 minutes to explore.",
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
                buttons: [
                    { label: "Open GenesisFX", href: "https://genesisx.io", color: "green" },
                          ],
      },
      {
                n: 4,
                title: "Download TradeLocker",
                desc: "Install from App Store or Google Play.",
                buttons: [
                    { label: "Download", href: "https://tradelocker.com", color: "green" },
                          ],
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
                desc: "Connect with fellow traders in our exclusive Discord.",
                buttons: [
                    { label: "Join Discord", href: "https://discord.gg/thegreenprint", color: "green" },
                          ],
      },
      {
                n: 8,
                title: "Start Trading",
                desc: "Apply everything you've learned and begin your trading journey.",
                buttons: [
                    { label: "View Trading Guide", href: "https://thegreenprint.trade/guide", color: "green" },
                          ],
      },
        ];

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-8"></div>
                      <div className="max-w-4xl mx-auto">
                                <h1 className="text-4xl font-bold mb-2">Welcome to The Greenprint</h1>h1></h1>
                                <p className="text-gray-400 mb-12">Complete these steps to get started with your trading journey.</p>p></p>
                
                        <div className="bg-gray-800 rounded-lg p-8 mb-8">
                                  <div className="flex items-center justify-between mb-6">
                                              <div>
                                                            <h2 className="text-3xl font-bold mb-2">Step {step.n}: {step.title}</h2>h2>
                                                  {step.subtitle && <p className="text-xl text-gray-300">{step.subtitle}</p>}
                                              </div>div>
                                              <div className="text-right">
                                                            <div className="text-5xl font-bold text-green-400">{step.n}</div>div>
                                                            <p className="text-gray-400">of {STEPS.length}</p>
                                              </div>div>
                                  </div>div>
                        
                            {step.desc && <p className="text-lg text-gray-300 mb-6">{step.desc}</p>}
                        
                            {step.videoId && (
                          <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
                                        <div className="aspect-video">
                                                        <iframe
                                                                              width="100%"
                                                                              height="100%"
                                                                              src={`https://www.youtube.com/embed/${step.videoId}`}
                                                                              title="YouTube video player"
                                                                              frameBorder="0"
                                                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                              allowFullScreen
                                                                              className="w-full h-full"
                                                                            />
                                        </div>div>
                          </div>div>
                                  )}
                        
                            {!step.videoId && (
                          <div className="bg-gray-700 rounded-lg h-64 flex items-center justify-center mb-6">
                                        <div className="text-center">
                                                        <p className="text-gray-400 text-lg">Step content</p>
                                        </div>div>
                          </div>div>
                                  )}
                        
                            {step.buttons && (
                          <div className="flex flex-wrap gap-4 mb-6">
                              {step.buttons.map((btn, idx) => (
                                              <a
                                                                    key={idx}
                                                                    href={btn.href}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`px-6 py-3 rounded-lg font-semibold transition ${
                                                                                            btn.color === "green"
                                                                                              ? "bg-green-500 hover:bg-green-600 text-black"
                                                                                              : "bg-gray-700 hover:bg-gray-600 text-white"
                                                                    }`}
                                                                  >
                                                  {btn.label}
                                              </a>a>
                                            ))}
                          </div>div>
                                  )}
                        </div>div>
                
                        <div className="flex justify-between items-center">
                                  <button
                                                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                                  disabled={currentStep === 0}
                                                  className="px-6 py-3 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
                                                >
                                              ← Previous
                                  </button>button>
                        
                                  <div className="flex gap-2">
                                      {STEPS.map((s, idx) => (
                            <button
                                                key={idx}
                                                onClick={() => setCurrentStep(idx)}
                                                className={`w-10 h-10 rounded-full font-semibold transition ${
                                                                      idx === currentStep
                                                                        ? "bg-green-500 text-black"
                                                                        : "bg-gray-700 hover:bg-gray-600 text-white"
                                                }`}
                                              >
                                {s.n}
                            </button>button>
                          ))}
                                  </div>div>
                        
                                  <button
                                                  onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
                                                  disabled={currentStep === STEPS.length - 1}
                                                  className="px-6 py-3 rounded-lg font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-black transition font-bold"
                                                >
                                              Next →
                                  </button>button>
                        </div>div>
                </div>div>
          </div>div>
        );
}</div>
