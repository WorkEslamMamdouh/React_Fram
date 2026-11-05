/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 🔥 مهم جدا

  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/ClientApp/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/preline/dist/*.js"
  ],

  theme: {
    extend: {
      colors: {
        erp: {
          canvas: 'var(--erp-canvas)',
          surface: 'var(--erp-surface)',
          'surface-2': 'var(--erp-surface-2)',
          'surface-3': 'var(--erp-surface-3)',
          border: 'var(--erp-border)',
          'border-strong': 'var(--erp-border-strong)',
          text: 'var(--erp-text)',
          'text-muted': 'var(--erp-text-muted)',
          'text-subtle': 'var(--erp-text-subtle)',
          primary: 'var(--erp-primary)',
          'primary-hover': 'var(--erp-primary-hover)',
          'on-primary': 'var(--erp-on-primary)',
          accent: 'var(--erp-accent)',
          'accent-hover': 'var(--erp-accent-hover)',
          'accent-soft': 'var(--erp-accent-soft)',
          info: 'var(--erp-info)',
          success: 'var(--erp-success)',
          'success-bg': 'var(--erp-success-bg)',
          'success-border': 'var(--erp-success-border)',
          'success-text': 'var(--erp-success-text)',
          warning: 'var(--erp-warning)',
          'warning-bg': 'var(--erp-warning-bg)',
          'warning-border': 'var(--erp-warning-border)',
          'warning-text': 'var(--erp-warning-text)',
          danger: 'var(--erp-danger)',
          'danger-bg': 'var(--erp-danger-bg)',
          'danger-border': 'var(--erp-danger-border)',
          'danger-text': 'var(--erp-danger-text)',
          overlay: 'var(--erp-overlay)',
        },
      },
      borderRadius: {
        'erp-card': '12px',
        'erp-field': '8px',
        'erp-badge': '6px',
      },
      boxShadow: {
        'erp-1': 'var(--erp-shadow-1)',
        'erp-2': 'var(--erp-shadow-2)',
        'erp-3': 'var(--erp-shadow-3)',
        'erp-4': 'var(--erp-shadow-4)',
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'var(--font-inter)', 'sans-serif'],
        inter: ['var(--font-inter)', 'var(--font-cairo)', 'sans-serif'],
      },
    },
  },

  plugins: [],
}
