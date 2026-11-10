import prettier from 'eslint-config-prettier';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships native flat configs, so no compatibility layer is needed.
const config = [
  {
    ignores: [
      '.next',
      'node_modules',
      'coverage',
      'design',
      'sentinel-api',
      'next-env.d.ts',
      'playwright-report',
      'test-results',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  prettier,
];

export default config;
