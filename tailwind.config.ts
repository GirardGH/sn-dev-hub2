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
          bg: "#f3f6f6",
          surface: "#ffffff",
          border: "#dde5e5",
          "border-dark": "#8b9c9f",
          text: "#263d43",
          "text-muted": "#657b80",
          accent: "#176b70",
          "accent-hover": "#105459",
          "accent-light": "#e9f3ef",
          success: "#4a8b4d",
          "success-light": "#e8f5ea",
          warning: "#e4a200",
          "warning-light": "#fdf5e0",
          danger: "#c42b29",
          "danger-light": "#fce8e8",
          header: "#102c3e",
          "header-text": "#ffffff",
          sidebar: "#1a2332",
          "sidebar-text": "#98afc7",
          "sidebar-active": "#176b70",
          "sidebar-hover": "#243146",
          "table-header": "#f7f9f9",
          "table-stripe": "#fcfdfd",
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
