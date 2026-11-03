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
      // The Stitch scale, with two deliberate bumps: labels 11 -> 12px and small mono data 12 -> 13px, because
      // data and labels should read at 12-14px (see docs/design.md).
      fontSize: {
        ...(tokens.fontSize as unknown as NonNullable<Config['theme']>['fontSize']),
        'label-mono': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'code-sm': ['13px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '400' }],
      },
      fontFamily,
    },
  },
  plugins: [],
};

export default config;
