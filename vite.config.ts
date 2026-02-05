import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/', // Garante que os caminhos funcionem na raiz
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Cria o atalho @ para a pasta src
    },
  },
});