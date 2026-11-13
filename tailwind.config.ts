import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1d5cff", soft: "#e8efff" },
        card: "#f1f6ff",
        panel: "#1a2b43",
      },
    },
  },
  plugins: [],
};
export default config;
