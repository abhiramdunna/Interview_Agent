module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        boxShadow: {
          '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
        },
        transitionProperty: {
          'height': 'height',
          'spacing': 'margin, padding',
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }
      },
    },
    plugins: [],
  }