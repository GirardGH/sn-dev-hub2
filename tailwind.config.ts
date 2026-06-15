import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sn: {
          bg: "#e2e5e7",
          surface: "#ffffff",
          border: "#d1d5db",
          "border-dark": "#9ca3af",
          text: "#1f2937",
          "text-muted": "#6b7280",
          accent: "#0066b3",
          "accent-hover": "#0052a3",
          "accent-light": "#dbeafe",
          success: "#16a34a",
          warning: "#d97706",
          danger: "#dc2626",
          "danger-light": "#fee2e2",
          header: "#293e40",
          "header-text": "#ffffff",
          sidebar: "#1a2e35",
          "sidebar-text": "#c8d6d8",
          "sidebar-active": "#0066b3",
          "sidebar-hover": "#243b42",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};
export default config;
