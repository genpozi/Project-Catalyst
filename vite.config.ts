
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    build: {
      // Critical for projects using index.html importmaps:
      // Tell Vite NOT to bundle these, but expect them to be available globally/via importmap
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react-dom/client',
          '@google/genai',
          '@mlc-ai/web-llm',
          'html-to-image',
          '@supabase/supabase-js',
          'reactflow',
          '@webcontainer/api',
          'xterm',
          'xterm-addon-fit',
          'jszip'
        ]
      }
    },
    optimizeDeps: {
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
  };
});
