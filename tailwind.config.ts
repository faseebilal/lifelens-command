import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        command: {
          950: "#070A0F",
          900: "#0B0F19",
          850: "#101624",
          800: "#161E30",
          700: "#222D46",
          600: "#324060",
          border: "rgba(255, 255, 255, 0.08)",
          card: "rgba(16, 22, 36, 0.7)",
          glass: "rgba(11, 15, 25, 0.85)",
          cyan: "#00E5FF",
          cyanGlow: "rgba(0, 229, 255, 0.25)",
          blue: "#3B82F6",
          amber: "#F59E0B",
          amberGlow: "rgba(245, 158, 11, 0.25)",
          red: "#EF4444",
          redGlow: "rgba(239, 68, 68, 0.25)",
          emerald: "#10B981",
          emeraldGlow: "rgba(16, 185, 129, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar 4s linear infinite",
        "glow-red": "glowRed 2s ease-in-out infinite alternate",
        "glow-cyan": "glowCyan 2s ease-in-out infinite alternate",
      },
      keyframes: {
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        glowRed: {
          "0%": { boxShadow: "0 0 10px rgba(239, 68, 68, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(239, 68, 68, 0.6)" },
        },
        glowCyan: {
          "0%": { boxShadow: "0 0 10px rgba(0, 229, 255, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(0, 229, 255, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
