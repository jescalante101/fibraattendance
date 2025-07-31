/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js"  // ← Agregado para Flowbite
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
          hover: '#f5f5f5',        
          active: '#e3f2fd',       
          muted: '#f8f9fa',        
        },
      },
      fontFamily: {
        sans: ['"72"', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        fiori: '0.25rem',          
      },
      boxShadow: {
        fiori: '0 1px 3px rgba(0,0,0,0.06)',
        fioriSm: '0 1px 2px rgba(0,0,0,0.05)',
        fioriHover: '0 2px 8px rgba(10,110,209,0.15)',
        fioriActive: '0 1px 3px rgba(10,110,209,0.2)',
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
        'sidebar-width': '260px',
        'sidebar-collapsed': '60px',
      },
      transitionProperty: {
        'max-height': 'max-height',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '200px', opacity: '1' },
        },
      },
    },
  },
  
  plugins: [
    require('@tailwindcss/forms'),
    require('flowbite/plugin'),  // ← Agregado plugin de Flowbite
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
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme('colors.fiori.secondary'),
            boxShadow: theme('boxShadow.fioriHover'),
          },
          '&:active': {
            boxShadow: theme('boxShadow.fioriActive'),
          },
        },
        '.btn-fiori-secondary': {
          backgroundColor: 'transparent',
          color: theme('colors.fiori.primary'),
          border: `1px solid ${theme('colors.fiori.primary')}`,
          padding: '0.5rem 1rem',
          fontWeight: '500',
          fontSize: theme('fontSize.base'),
          borderRadius: theme('borderRadius.fiori'),
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme('colors.fiori.primary'),
            color: '#fff',
          },
        },
        '.card-fiori': {
          backgroundColor: theme('colors.fiori.surface'),
          borderRadius: theme('borderRadius.fiori'),
          padding: theme('spacing.card-padding'),
          boxShadow: theme('boxShadow.fiori'),
          border: `1px solid ${theme('colors.fiori.border')}`,
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
        '.sidebar-item': {
          display: 'flex',
          alignItems: 'center',
          padding: '0.625rem 1rem',
          borderRadius: theme('borderRadius.fiori'),
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme('colors.fiori.hover'),
          },
          '&.active': {
            backgroundColor: theme('colors.fiori.active'),
            color: theme('colors.fiori.primary'),
            fontWeight: '500',
          },
        },
      });
    }),
  ],

}