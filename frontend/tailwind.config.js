const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), raised: v("raised"), ink: v("ink"), muted: v("muted"), line: v("line"),
        heading: v("heading"), brand: v("brand"), onbrand: v("onbrand"), accent: v("accent"), onaccent: v("onaccent"),
        danger: v("danger"), good: v("good"), rail: v("rail"), onrail: v("onrail"), nav: v("nav"),
      },
      fontFamily: {
        display: ['"Noto Sans"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "0.5rem" },
      boxShadow: { card: "0 1px 2px rgb(11 31 66 / 0.06), 0 4px 14px rgb(11 31 66 / 0.06)" },
    },
  },
  plugins: [],
};
