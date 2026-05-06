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
        accent: {
          DEFAULT: "#4a2b17",
          dark: "#3a2010",
          darker: "#2e180c",
          light: "#8b6253",
          lightest: "#f5ece7",
        },
        "blue-lagoon":"#2f7f95",
        "chocolate-fondant":"#4a2b17",
        "strawberry":"#ffe2e7"
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
      },
      screens: {
        xs: "390px",
      },
    },
  },
  plugins: [],
};
export default config;
