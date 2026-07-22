/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  'hsl(250, 84%, 97%)',
          100: 'hsl(250, 84%, 93%)',
          200: 'hsl(250, 84%, 86%)',
          500: 'hsl(250, 84%, 60%)',
          600: 'hsl(250, 84%, 52%)',
          700: 'hsl(250, 84%, 44%)',
        },
        surface: {
          bg:      'hsl(230, 20%, 97%)',
          card:    'hsl(0, 0%, 100%)',
          input:   'hsl(230, 15%, 96%)',
        },
        note: {
          yellow:  'hsl(45,  96%, 92%)',
          green:   'hsl(152, 63%, 90%)',
          red:     'hsl(0,   72%, 93%)',
          blue:    'hsl(210, 90%, 92%)',
          pink:    'hsl(330, 80%, 92%)',
          teal:    'hsl(175, 60%, 90%)',
          orange:  'hsl(28,  95%, 92%)',
          purple:  'hsl(275, 70%, 92%)',
        },
      },
      boxShadow: {
        'card':    '0 1px 3px hsla(230,20%,10%,0.07), 0 1px 2px hsla(230,20%,10%,0.05)',
        'card-hover': '0 4px 16px hsla(230,20%,10%,0.10)',
        'modal':   '0 16px 56px hsla(230,20%,10%,0.18)',
        'brand':   '0 4px 20px hsla(250,84%,60%,0.25)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 200ms ease both',
        'fade-up':    'fadeUp 250ms ease both',
        'scale-in':   'scaleIn 200ms cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-up':   'slideUp 300ms ease both',
        'shimmer':    'shimmer 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp:  { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.94)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(32px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
}
