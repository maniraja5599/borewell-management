import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
    // Relative paths so the build works on GitHub Pages under /borewell-management/
    base: './',
    // App version shown in Settings and on the sign-in page (src/config/version.js)
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10))
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                dashboard: resolve(import.meta.dirname, 'dashboard.html'),
                admin: resolve(import.meta.dirname, 'admin.html')
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
