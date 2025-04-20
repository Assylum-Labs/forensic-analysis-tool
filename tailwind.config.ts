/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#333",
        input: "#333",
        ring: "#444",
        background: "#121212",
        foreground: "#EDEDED",
        primary: {
          DEFAULT: "#9945FF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#14F195",
          foreground: "#000000",
        },
        destructive: {
          DEFAULT: "#FF0000",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1E1E1E",
          foreground: "#A0A0A0",
        },
        accent: {
          DEFAULT: "#00C2FF",
          foreground: "#000000",
        },
        popover: {
          DEFAULT: "#1A1A1A",
          foreground: "#EDEDED",
        },
        card: {
          DEFAULT: "#1A1A1A",
          foreground: "#EDEDED",
        },
        solana: {
          purple: "#9945FF",
          green: "#14F195",
          blue: "#00C2FF",
          deepBlue: "#0047BA",
          navy: "#1A202C",
          dark: "#121212"
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.3rem",
        sm: "0.2rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}