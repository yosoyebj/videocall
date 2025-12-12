/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6366f1', // Indigo-500
                    hover: '#4f46e5',
                },
                secondary: '#a855f7', // Purple-500
                surface: '#1c1c1e',
                'surface-highlight': '#2c2c2e',
            },
            backgroundImage: {
                'gradient-dusk': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                'gradient-sunrise': 'linear-gradient(135deg, #f472b6 0%, #fb923c 100%)',
            },
            borderRadius: {
                lg: '16px',
                xl: '24px',
                '2xl': '32px',
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            },
            animation: {
                'gentle-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
