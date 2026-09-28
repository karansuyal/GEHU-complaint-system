/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        ink: {
          DEFAULT: '#17211D',
          soft: '#42473F',
          faint: '#8C8A7E'
        },
        stone: {
          100: '#F1EFE9',
          200: '#E4E1D8',
          300: '#DEDBD3',
          400: '#C9C4B6'
        },
        pine: {
          50: '#EAF1EC',
          100: '#DCE8E0',
          400: '#3A6B54',
          500: '#204B3B',
          600: '#193C2F',
          700: '#132E24'
        },
        brass: {
          50: '#FBF3E4',
          100: '#F3E1BB',
          500: '#B8862E',
          600: '#96701F'
        },
        rust: {
          50: '#F9EDEA',
          100: '#F0D5CC',
          500: '#A8412E',
          600: '#8A3324'
        },
        slate: {
          50: '#EBF0F3',
          100: '#D3DEE5',
          500: '#3B5B73',
          600: '#2E4A5E'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 33, 29, 0.05), 0 1px 1px rgba(23, 33, 29, 0.03)',
        lifted: '0 16px 32px -12px rgba(23, 33, 29, 0.22)',
        glow: '0 0 0 4px rgba(58, 107, 84, 0.12)'
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px'
      }
    }
  },
  plugins: []
}