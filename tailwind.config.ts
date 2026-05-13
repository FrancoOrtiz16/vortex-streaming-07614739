import type { Config } from "tailwindcss";
import * as animatePlugin from "tailwindcss-animate";

const animate = (animatePlugin.default ?? animatePlugin) as any;

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      /* Breakpoints optimizados para mobile-first */
      '2xs': '320px',   /* Dispositivos muy pequeños */
      'xs': '375px',    /* iPhone SE, pequeños */
      'sm': '640px',    /* Tabletas pequeñas */
      'md': '768px',    /* Tabletas */
      'lg': '1024px',   /* Desktops */
      'xl': '1280px',   /* Desktops grandes */
      '2xl': '1536px',  /* Desktops muy grandes */
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neon: {
          DEFAULT: "hsl(var(--neon-blue))",
          glow: "hsl(var(--neon-blue-glow))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          soft: "hsl(var(--gold-soft))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        /* Espaciado relativo para responsividad */
        'xs': 'clamp(0.25rem, 1vw, 0.5rem)',
        'sm': 'clamp(0.5rem, 2vw, 1rem)',
        'md': 'clamp(1rem, 3vw, 1.5rem)',
        'lg': 'clamp(1.5rem, 4vw, 2rem)',
        'xl': 'clamp(2rem, 5vw, 2.5rem)',
      },
      fontSize: {
        /* Tamaños de fuente escalables */
        'xs': 'clamp(0.625rem, 1.5vw, 0.75rem)',
        'sm': 'clamp(0.75rem, 2vw, 0.875rem)',
        'base': 'clamp(0.875rem, 2.5vw, 1rem)',
        'lg': 'clamp(1rem, 3vw, 1.25rem)',
        'xl': 'clamp(1.25rem, 4vw, 1.5rem)',
        '2xl': 'clamp(1.5rem, 5vw, 1.875rem)',
        '3xl': 'clamp(1.875rem, 6vw, 2.25rem)',
        '4xl': 'clamp(2.25rem, 7vw, 2.75rem)',
        '5xl': 'clamp(2.75rem, 8vw, 3.75rem)',
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
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-neon": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "drift": {
          "0%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(8px, -6px)" },
          "50%": { transform: "translate(-6px, 10px)" },
          "75%": { transform: "translate(4px, -8px)" },
          "100%": { transform: "translate(-2px, 6px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "100% 0%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-neon": "pulse-neon 2s ease-in-out infinite",
        "drift": "drift 28s ease-in-out infinite alternate",
        "shimmer": "shimmer 2s linear infinite",
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '300ms',
        'smooth': '500ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;