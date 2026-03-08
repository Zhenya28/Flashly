/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#09090B',
        card: '#FFFFFF',
        cardForeground: '#09090B',
        primary: '#18181B',
        primaryForeground: '#FAFAFA',
        secondary: '#F4F4F5',
        secondaryForeground: '#18181B',
        muted: '#F4F4F5',
        mutedForeground: '#71717A',
        accent: '#F4F4F5',
        accentForeground: '#18181B',
        destructive: '#EF4444',
        destructiveForeground: '#FAFAFA',
        border: '#E4E4E7',
        input: '#E4E4E7',
        input: '#E4E4E7',
        ring: '#18181B',
        brand: {
          DEFAULT: '#4C1D95', // Violet-900
          dark: '#1E1B4B',    // Indigo-950
          light: '#5B21B6',   // Violet-800
        }
      },
      fontFamily: {
        sans: ['Geist', 'System'],
        mono: ['Geist Mono', 'System'],
      }
    },
  },
  plugins: [],
}
