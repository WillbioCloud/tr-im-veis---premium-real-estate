/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },

      colors: {
        // ✅ Sua paleta atual (mantida)
        brand: {
          50: '#fbf7f0',  // Off-white creme
          100: '#f5efe0',
          200: '#eadbc0',
          300: '#dec29a',
          400: '#d2a36b',
          500: '#c68a44', // Dourado Bronze (Base)
          600: '#ac7036',
          700: '#8e562e',
          800: '#75452b',
          900: '#613a26',
          950: '#361e12',
        },

        // ✅ Seu dark theme atual (mantido)
        dark: {
          bg: '#0f172a',      // Fundo Profundo (Slate 900)
          card: '#1e293b',    // Cards (Slate 800)
          border: '#334155',  // Bordas (Slate 700)
          text: '#f8fafc',    // Texto Quase Branco (Slate 50)
          muted: '#94a3b8',   // Texto Secundário (Slate 400)
          hover: '#334155'    // Hover states
        },

        // ✅ NOVO: tokens CRM (para ficar igual ao concept)
        crm: {
          bg: '#FFF5DE',        // fundo geral (um bege claro)
          surface: '#FFFFFF',   // cards/branco puro
          border: '#E7ECF3',    // borda sutil
          text: '#0B1220',      // texto forte
          body: '#334155',      // texto normal
          muted: '#64748B',     // texto secundário

          navy: '#0F172A',      // sidebar navy
          navy2: '#101030',

          primary: '#50C070',   // verde do print (ativo/underline)
          secondary: '#7030E0', // roxo do print (pills/badges)
        },
      },

      // ✅ Sombras (bem “SaaS clean” como no print)
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
        soft2: '0 1px 2px rgba(15,23,42,0.06)',
      },

      // ✅ Bordas “premium”
      borderRadius: {
        xl2: '1rem',
      },

      // ✅ Suas animações atuais (mantidas)
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
