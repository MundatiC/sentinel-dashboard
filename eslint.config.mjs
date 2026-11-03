import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-config-prettier';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      '.next',
      'node_modules',
      'coverage',
      'design',
      'next-env.d.ts',
      'playwright-report',
      'test-results',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettier,
];

export default config;
