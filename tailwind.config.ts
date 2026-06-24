import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kashio brand green
        brand: {
          50: "#eafaf0",
          100: "#d0f3de",
          200: "#a6e8c0",
          500: "#22b455",
          600: "#1a9d4a",
          700: "#15823d",
          800: "#116531",
          900: "#0c4d24",
        },
        // Maple-leaf accent
        accent: "#f5821f",
        // Dark shell / sidebar tones
        shell: "#16211b",
        sidebar: "#0f1712",
        "sidebar-hover": "#1a241d",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
