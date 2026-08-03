/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand / Primary (30%) — FamilyMart Cyan/Teal
        brand: {
          DEFAULT: "#2596be",
          hover: "#52B2D6",
          active: "#1B6E8D",
          50: "#EAF6FA",
          100: "#CFEBF3",
          200: "#A0D7E8",
          300: "#71C3DC",
          400: "#52B2D6", // hover
          500: "#2596be", // default
          600: "#1F7FA1",
          700: "#1B6E8D", // active
          800: "#164E63",
          900: "#0F3A49",
        },
        // Dominant background (60%)
        canvas: {
          DEFAULT: "#FFFFFF",
          off: "#F8FAFC",
        },
        // Accent / Text / Action (10%)
        ink: {
          DEFAULT: "#0F172A", // dark slate typography
        },
        success: {
          DEFAULT: "#10B981", // emerald — pay / success actions
          hover: "#0EA271",
          active: "#0B8A5F",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.08)",
        scanner: "0 0 0 2px #2596be, 0 0 24px rgba(37, 150, 190, 0.35)",
      },
      keyframes: {
        "scan-line": {
          "0%": { transform: "translateY(0%)" },
          "50%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0%)" },
        },
        "beep-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.6)" },
          "100%": { boxShadow: "0 0 0 16px rgba(16, 185, 129, 0)" },
        },
      },
      animation: {
        "scan-line": "scan-line 2s ease-in-out infinite",
        "beep-pulse": "beep-pulse 0.6s ease-out",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};
