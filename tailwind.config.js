/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        fiori: {
          primary: '#0a6ed1',
          secondary: '#0854a0',
          accent: '#f0ab00',
          background: '#f9f9f9',
          surface: '#ffffff',
          border: '#d1d1d1',
          text: '#32363a',
          subtext: '#6a6d70',
          error: '#bb0000',
          warning: '#e9730c',
          success: '#107e3e',
          info: '#0a6ed1',
        },
      },
      fontFamily: {
        sans: ['"72"', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        fiori: '0.5rem',
      },
      boxShadow: {
        fiori: '0 2px 6px rgba(0,0,0,0.08)',
        fioriSm: '0 1px 3px rgba(0,0,0,0.05)',
        fioriHover: '0 4px 12px rgba(0,0,0,0.1)',
      },
      fontSize: {
        sm: '0.75rem',
        base: '0.875rem',
        lg: '1rem',
        xl: '1.125rem',
        title: '1.25rem',
        subtitle: '1.125rem',
      },
      spacing: {
        'card-padding': '1rem',
        'section': '2rem',
        'nav-height': '3rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    plugin(function ({ addComponents, theme }) {
      addComponents({
        '.btn-fiori': {
          backgroundColor: theme('colors.fiori.primary'),
          color: '#fff',
          padding: '0.5rem 1rem',
          fontWeight: '500',
          fontSize: theme('fontSize.base'),
          borderRadius: theme('borderRadius.fiori'),
          boxShadow: theme('boxShadow.fioriSm'),
          transition: 'background-color 0.2s ease',
        },
        '.btn-fiori:hover': {
          backgroundColor: theme('colors.fiori.secondary'),
        },
        '.card-fiori': {
          backgroundColor: theme('colors.fiori.surface'),
          borderRadius: theme('borderRadius.fiori'),
          padding: theme('spacing.card-padding'),
          boxShadow: theme('boxShadow.fiori'),
        },
        '.text-label': {
          color: theme('colors.fiori.subtext'),
          fontSize: theme('fontSize.base'),
          fontWeight: '500',
        },
        '.text-title': {
          color: theme('colors.fiori.text'),
          fontSize: theme('fontSize.title'),
          fontWeight: '600',
        },
      });
    }),
  ],
}
