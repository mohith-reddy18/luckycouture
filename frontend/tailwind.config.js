/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#443742",
        secondary: "#846C5B",
        accent: "#C1791F",
        highlight: "#EDD9A3",
        bg: "#F8F6F2",
        ink: "#2B2B2B",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(68, 55, 66, 0.25)",
        card: "0 4px 24px -6px rgba(68, 55, 66, 0.12)",
      },
      backgroundImage: {
        "stitch-line":
          "repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        fadeUp: "fadeUp 0.7s ease forwards",
      },
    },
  },
  plugins: [],
};
