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
          bg: "#eef1f5",
          surface: "#ffffff",
          border: "#c7cdd4",
          "border-dark": "#8a94a0",
          text: "#2e3a4d",
          "text-muted": "#67778e",
          accent: "#0661C5",
          "accent-hover": "#0452a1",
          "accent-light": "#e8f1fc",
          success: "#3ab549",
          "success-light": "#e8f5ea",
          warning: "#e4a200",
          "warning-light": "#fdf5e0",
          danger: "#c42b29",
          "danger-light": "#fce8e8",
          header: "#151f2b",
          "header-text": "#ffffff",
          sidebar: "#1a2332",
          "sidebar-text": "#98afc7",
          "sidebar-active": "#0661C5",
          "sidebar-hover": "#243146",
          "table-header": "#f0f4f7",
          "table-stripe": "#f7f9fb",
        },
      },
      fontFamily: {
        sans: ["Source Sans 3", "Source Sans Pro", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
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
