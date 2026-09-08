function withAlpha(variable) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `var(${variable})`
      : `color-mix(in srgb, var(${variable}) ${Number(opacityValue) * 100}%, transparent)`;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha("--color-background"),
        foreground: withAlpha("--color-foreground"),
        surface: withAlpha("--color-surface"),
        muted: withAlpha("--color-muted"),
        border: withAlpha("--color-border"),
        primary: withAlpha("--color-primary"),
        "on-primary": withAlpha("--color-on-primary"),
        accent: withAlpha("--color-accent"),
        destructive: withAlpha("--color-destructive"),
        ring: withAlpha("--color-ring"),
        hover: withAlpha("--color-hover"),
        input: withAlpha("--color-input"),
        overlay: withAlpha("--color-overlay"),
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
