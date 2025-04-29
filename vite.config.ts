
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { ConfigEnv, LogLevel } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  server: {
    host: "::",
    port: 8080,
    https: {
      // Empty object is not valid for TypeScript - needs to be a proper ServerOptions object
    }, 
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: [],
  },
  esbuild: {
    logOverride: {
      // Need to properly type this as a LogLevel
      'this-is-undefined-in-esm': 'silent' as LogLevel
    }
  }
}));
