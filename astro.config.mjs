import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://patr.cloud',
  redirects: {
    '/posts/[...slug]': '/blog/[...slug]',
  },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'catppuccin-mocha',
      wrap: false,
    },
  },
});
