import { defineConfig } from 'vite';

export default defineConfig({
    // Relative paths so the build works on GitHub Pages under /borewell-management/
    base: './',
    build: {
        outDir: 'dist',
        sourcemap: true
    },
    server: {
        port: 5173
    },
    test: {
        include: ['tests/**/*.test.js']
    }
});
