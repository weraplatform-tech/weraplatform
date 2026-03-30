/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0A1628', 50: '#E8EBF0', 100: '#C5CEDC', 200: '#8FA3BE', 300: '#5A78A0', 400: '#2D4D82', 500: '#0A1628', 600: '#08121F', 700: '#060E18', 800: '#040A11', 900: '#02050A' },
        gold:  { DEFAULT: '#C9A84C', 50: '#FBF5E6', 100: '#F5E8C1', 200: '#EDD28B', 300: '#E4BB56', 400: '#C9A84C', 500: '#A98A30', 600: '#886C20', 700: '#664F14', 800: '#44330B', 900: '#221804' },
        slate: { DEFAULT: '#64748B', 50: '#F8F9FA', 100: '#F1F3F5', 200: '#E2E6EA', 300: '#CED4DA', 400: '#ADB5BD', 500: '#64748B', 600: '#4A5568', 700: '#2D3748', 800: '#1A202C', 900: '#0D1117' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-gold':  'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                    to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight:{ from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(201,168,76,0)' } },
      },
      boxShadow: {
        'navy':  '0 4px 24px rgba(10,22,40,0.25)',
        'gold':  '0 4px 24px rgba(201,168,76,0.25)',
        'card':  '0 2px 12px rgba(10,22,40,0.08)',
        'card-hover': '0 8px 32px rgba(10,22,40,0.16)',
      },
    },
  },
  plugins: [],
}
