/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#087F73',
          dark: '#066A61',
          700: '#087F73',
          800: '#066A61',
          600: '#0A9385',
          100: '#D7ECE8',
          50: '#EDF6F4',
        },
        amber: {
          DEFAULT: '#F4A629',
          dark: '#D68A0F',
          100: '#FDEDD3',
          50: '#FEF7EA',
        },
        ink: '#17232D',
        bg: '#F7F9FA',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F1F4F5',
        },
        line: '#E3E8EA',
        muted: '#65747E',
        success: {
          DEFAULT: '#18A66A',
          100: '#D7F0E4',
          50: '#EBF8F1',
        },
        warning: {
          DEFAULT: '#F5A623',
          100: '#FDEDD3',
          50: '#FEF7EA',
        },
        danger: {
          DEFAULT: '#E5484D',
          100: '#FBDCDD',
          50: '#FDEEEF',
        },
        info: {
          DEFAULT: '#3979E9',
          100: '#DBE6FB',
          50: '#EDF3FD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        label: ['13px', { lineHeight: '18px' }],
        body: ['14px', { lineHeight: '20px' }],
        'card-title': ['15px', { lineHeight: '22px' }],
        'section-title': ['18px', { lineHeight: '26px' }],
        kpi: ['27px', { lineHeight: '34px' }],
        'page-title': ['34px', { lineHeight: '42px' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        sidebar: '224px',
        header: '76px',
        drawer: '336px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 35, 45, 0.04)',
        pop: '0 8px 24px rgba(23, 35, 45, 0.08)',
        overlay: '0 16px 48px rgba(23, 35, 45, 0.16)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-right': {
          from: { transform: 'translateX(16px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
      },
    },
  },
  plugins: [],
}
