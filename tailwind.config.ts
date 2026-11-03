import type { Config } from 'tailwindcss';
import tokens from './design/tokens.json';

// The design tokens come straight from the Stitch project (design/tokens.json): the colour roles,
// type scale, spacing and radii used in every mock-up. Components use the same class names
// (bg-surface-container, text-on-surface, text-headline-md ...) as the exported HTML, so the
// screens can be compared one to one.
const fontFamily = Object.fromEntries(
  Object.entries(tokens.fontFamily).map(([name, [family]]) => [
    name,
    family === 'JetBrains Mono'
      ? ['var(--font-mono)', 'ui-monospace', 'monospace']
      : ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  ]),
);

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens.colors,
      borderRadius: tokens.borderRadius,
      spacing: tokens.spacing,
      fontSize: tokens.fontSize as unknown as NonNullable<Config['theme']>['fontSize'],
      fontFamily,
    },
  },
  plugins: [],
};

export default config;
