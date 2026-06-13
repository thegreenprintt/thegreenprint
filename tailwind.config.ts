import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:        "#080808",
        surface:   "#111111",
        surface2:  "#1A1A1A",
        border:    "#1E1E1E",
        accent:    "#00FF85",
        gold:      "#C9A84C",
        text:      "#F5F5F5",
        muted:     "#666666",
        red:       "#FF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      letterSpacing: { tight: "-0.03em" },
      borderRadius: {
        card: "8px",
        btn:  "6px",
        inp:  "4px",
      },
      boxShadow: {
        accent: "0 0 0 1px #00FF85",
        gold:   "0 0 0 1px #C9A84C",
      },
    },
  },
  plugins: [],
};

export default config;
