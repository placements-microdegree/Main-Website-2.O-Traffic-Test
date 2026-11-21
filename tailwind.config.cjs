/** Same theme as the original MicroDegree site so the ported markup renders identically. */
module.exports = {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        'reddit-sans': ['Reddit Sans', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        nunito: ['Nunito', 'sans'],
        libre: ['Libre Baskerville', 'serif'],
      },
      keyframes: {
        popup: { '75%': { transform: 'scale(0)', opacity: 1 }, '100%': { transform: 'scale(2)', opacity: 0 } },
        marquee: { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-100%)' } },
        marquee2: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0%)' } },
      },
      animation: {
        popup: 'popup 1s cubic-bezier(0, 0, 0.2, 1)',
        marquee: 'marquee 25s linear infinite',
        marquee2: 'marquee2 25s linear infinite',
      },
      colors: { mdpink: '#FF0049' },
    },
  },
  plugins: [require('tailwind-scrollbar-hide'), require('@tailwindcss/aspect-ratio')],
};
