import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://vitejs.dev/logo.svg',
        namespace: 'npm/vite-plugin-monkey',
        match: ['https://www.google.com/',
          'http*://www.youtube.com/feed/subscriptions',
          'http*://www.youtube.com/user/*',
          'http*://www.youtube.com/c*/*',
          'http*://www.youtube.com/c*/*/videos*',
          'http*://www.youtube.com/c*/*/featured*',
          'http*://www.youtube.com/@*/*',
          'http*://www.youtube.com/@*/*/videos*',
          'http*://www.youtube.com/@*/*/featured*',
          'http*://www.youtube.com/watch?*v=*',
          'http*://www.youtube.com/results?*',
          'http*://www.youtube.com/feed/history',
          'http*://www.youtube.com/'
        ],
      },
    }),
  ],
});
