import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        // Spotter color scheme
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--text-primary)",
        },
        rest: "var(--rest-color)",
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
        input: "var(--input)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--text-primary)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "#000000",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--text-primary)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      minHeight: {
        'touch': '44px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translateY(0)' },
          '40%, 43%': { transform: 'translateY(-8px)' },
          '70%': { transform: 'translateY(-4px)' },
          '90%': { transform: 'translateY(-2px)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
        'hard': '0 8px 24px -4px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config