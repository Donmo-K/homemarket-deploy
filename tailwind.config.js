module.exports = {
  content: [
    "./templates/**/*.html",
    "./**/templates/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#000080",
        accent: "#D4AF37",
        "background-light": "#f5f5f8",
        "background-dark": "#0f0f23",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}