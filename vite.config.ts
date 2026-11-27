import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {publicPageMetadata} from './seo-build';
export default defineConfig({
  plugins:[react(),tailwind(),publicPageMetadata()],
  build:{rollupOptions:{output:{manualChunks(id){
    if(id.includes('/node_modules/')&&/\/(framer-motion|motion-dom|motion-utils)\//.test(id))return 'motion';
  }}}},
});
