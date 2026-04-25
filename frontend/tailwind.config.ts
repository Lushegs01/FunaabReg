import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        line: "#D7DEE5",
        surface: "#F8FAFC",
        brand: "#0F766E",
        accent: "#B42318"
      }
    }
  },
  plugins: []
};

export default config;
