import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
