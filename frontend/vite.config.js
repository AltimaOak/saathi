import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'), // Load the single root .env file
  server: {
    port: 3000,
    open: false,
    host: true,
  },
});
