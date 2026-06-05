import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import pkg from "./package.json" assert { type: "json" };

const BUILD_APP_VERSION = process.env.VITE_APP_VERSION
  ?? (pkg.version && pkg.version !== "0.0.0" ? pkg.version : new Date().toISOString());
const VERSION_JSON_PATH = path.resolve(__dirname, "public", "version.json");

try {
  fs.writeFileSync(
    VERSION_JSON_PATH,
    JSON.stringify({ version: BUILD_APP_VERSION }, null, 2),
    'utf-8'
  );
} catch (error) {
  console.warn('[vite] No se pudo escribir public/version.json', error);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  build: {
    // ===================================================================
    // 🚀 ESTRATEGIA DE CACHE BUSTING CON HASH
    // ===================================================================
    // Genera hashes basados en el contenido (no en timestamps)
    // Esto asegura que solo archivos modificados reciban nuevo hash
    rollupOptions: {
      output: {
        // Archivos JavaScript con hash de contenido
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        
        // Archivos CSS, imágenes y otros assets con hash
        assetFileNames: ({ name }) => {
          if (name?.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          if (/\.(woff2?|ttf|otf|eot)$/.test(name || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },

    // Generar sourcemaps para debugging en producción
    sourcemap: false, // Cambiar a true si necesitas debugging
    
    // Optimización de chunks
    commonjsOptions: {
      transformMixedEsModules: true,
    },

    // Target y compatibilidad
    target: 'esnext',
    minify: 'terser', // Requiere: npm install terser --save-dev
    
    // Tamaño de chunks
    chunkSizeWarningLimit: 1000,
  },

  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(BUILD_APP_VERSION),
    '__APP_VERSION__': JSON.stringify(BUILD_APP_VERSION),
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Configuración de optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'next-themes',
    ],
    exclude: ['vite-plugin-pwa'],
  },
}));
