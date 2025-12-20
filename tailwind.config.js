/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#FF6B58',
          dark: '#FF8A7A', // Vibrant Coral for dark mode
        },
        teal: {
          DEFAULT: '#0D9488', // Deep Teal
          dark: '#14B8A6', // Cyan Teal
        },
        amber: {
          DEFAULT: '#F59E0B',
          dark: '#FBB040', // Golden Amber
        },
        dark: {
          bg: '#0A0A0A', // Rich Black
          surface: '#171717', // Dark Gray
        },
        light: {
          bg: '#FAFAF9', // Warm White
        },
      },
      fontFamily: {
        'rubik': ['Rubik-Regular', 'sans-serif'],
        'rubik-bold': ['Rubik-Bold', 'sans-serif'],
        'rubik-medium': ['Rubik-Medium', 'sans-serif'],
        'rubik-light': ['Rubik-Light', 'sans-serif'],
        'rubik-semibold': ['Rubik-SemiBold', 'sans-serif'],
        'rubik-extrabold': ['Rubik-ExtraBold', 'sans-serif'],
      },
    },
  },
  plugins: [],
}