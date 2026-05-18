import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FAEEDA',
          100: '#FAC775',
          200: '#F8B651',
          300: '#F5A536',
          400: '#F2941F',
          500: '#EF9F27',
          600: '#BA7517',
          700: '#8C580E',
          800: '#5E3B07',
          900: '#412402',
        },
        success: {
          50: '#EAF3DE',
          500: '#639922',
          800: '#27500A',
        },
        warning: {
          50: '#FAEEDA',
          500: '#EF9F27',
          800: '#5E3B07',
        },
        danger: {
          50: '#FCEBEB',
          500: '#E24B4A',
          800: '#791F1F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
