/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],

  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Cairo",
          "Inter",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Cairo",
          "Inter",
          "sans-serif",
        ],
        en: ["Inter", "Manrope", "Segoe UI", "sans-serif"],
      },

      colors: {
        /* Brand — derived from BKR CAD logo gradient */
        primary: {
          DEFAULT: "#2D8DB3",
          dark: "#234E7A",
          light: "#4AAED6",
          50: "#EBF6FA",
          100: "#D6EDF5",
          200: "#ADD9EB",
          300: "#7EC4E0",
          400: "#4AAED6",
          500: "#2D8DB3",
          600: "#247A9C",
          700: "#1C6684",
          800: "#155268",
          900: "#0E3E4D",
        },
        secondary: {
          DEFAULT: "#1E2A6D",
          light: "#2A3A8F",
          dark: "#141D4A",
        },
        accent: {
          DEFAULT: "#48CAE4",
          light: "#90E0EF",
          dark: "#0096C7",
        },

        /* Semantic */
        success: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
          dark: "#059669",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          dark: "#D97706",
        },
        error: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          dark: "#DC2626",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#DBEAFE",
          dark: "#2563EB",
        },

        /* Surfaces */
        background: {
          DEFAULT: "#F5F7FA",
          subtle: "#EEF1F6",
          muted: "#E5E9F0",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          elevated: "#FFFFFF",
          sunken: "#F8FAFC",
        },
        text: {
          primary: "#1A1A2E",
          secondary: "#64748B",
          muted: "#94A3B8",
          inverse: "#FFFFFF",
          onDark: "#E8F4F8",
        },
        border: {
          DEFAULT: "#E2E8F0",
          light: "#F1F5F9",
          dark: "#CBD5E1",
        },

        /* Dark sections (hero, footer) */
        navy: {
          DEFAULT: "#1E2A6D",
          deep: "#0A1B2A",
          mid: "#141D4A",
        },
      },

      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #1E2A6D 0%, #2D8DB3 55%, #4AAED6 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(30,42,109,0.95) 0%, rgba(45,141,179,0.9) 55%, rgba(74,174,214,0.85) 100%)",
        "hero-mesh":
          "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(72,202,228,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(45,141,179,0.2) 0%, transparent 55%)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)",
      },

      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },

      boxShadow: {
        xs: "0 1px 2px rgba(15, 23, 42, 0.04)",
        sm: "0 2px 8px rgba(15, 23, 42, 0.06)",
        card: "0 4px 24px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 8px 32px rgba(15, 23, 42, 0.10)",
        primary: "0 8px 24px rgba(45, 141, 179, 0.28)",
        "primary-sm": "0 4px 14px rgba(45, 141, 179, 0.20)",
        elevated: "0 12px 40px rgba(15, 23, 42, 0.12)",
        inner: "inset 0 2px 4px rgba(15, 23, 42, 0.04)",
      },

      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.5rem", letterSpacing: "0.005em" }],
        base: ["1rem", { lineHeight: "1.75rem" }],
        lg: ["1.125rem", { lineHeight: "1.875rem" }],
        xl: ["1.25rem", { lineHeight: "2rem" }],
        "2xl": ["1.5rem", { lineHeight: "2.25rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.875rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
        "5xl": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "6xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.035em" }],
      },

      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },

      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.5s ease-out both",
        "slide-in-right": "slideInRight 0.7s ease-out both",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },

      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },

      transitionDuration: {
        250: "250ms",
      },
    },
  },

  plugins: [],
};