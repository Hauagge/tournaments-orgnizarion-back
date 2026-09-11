import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const { default: tsConfigPaths } = await import('vite-tsconfig-paths');
  const { default: swc } = await import('unplugin-swc');

  return {
    test: {
      globals: true,
      setupFiles: ['./test/vitest-setup.ts'],
      alias: {
        '@': '/src',
      },
    },
    plugins: [
      tsConfigPaths(),
      swc.vite({
        module: { type: 'es6' },
      }),
    ],
  };
});
