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
