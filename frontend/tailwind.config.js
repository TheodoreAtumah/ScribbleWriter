/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper base — not stark white.
        paper: {
          DEFAULT: "#FAF6ED",
          soft: "#F5EFE1",
          deep: "#EFE7D3",
        },
        // Deep navy ink, echoing the icon's background.
        ink: {
          DEFAULT: "#1B2340",
          soft: "#2A3455",
          faint: "#5C6588",
        },
        // Brass/gold from the icon — the puzzle-piece motif color.
        brass: {
          DEFAULT: "#B8935A",
          light: "#D3B382",
          dark: "#96754A",
        },
      },
      fontFamily: {
        serif: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        book: "0 20px 40px -12px rgba(27, 35, 64, 0.25)",
      },
    },
  },
  plugins: [],
};
