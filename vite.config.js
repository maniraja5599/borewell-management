import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Relative paths so the build works on GitHub Pages under /borewell-management/
    base: './',
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                dashboard: resolve(import.meta.dirname, 'dashboard.html')
            }
        }
    },
    server: {
        port: 5173
    },
    test: {
        include: ['tests/**/*.test.js']
    }
});
