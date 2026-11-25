import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  outDir: './dist_site',
  publicDir: './public',
  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        allow: ['.'],
      },
    },
  },
});
