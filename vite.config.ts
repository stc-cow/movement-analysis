import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_PAGES && repoName ? `/${repoName}/` : "/";

export default defineConfig(({ mode }) => ({
  // For GitHub Pages: if deployed to https://username.github.io/repo-name/
  // base must be "/repo-name/". For root domain, use "/"
  base,
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "./node_modules"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
    // HMR configuration to prevent "send was called before connect" errors
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 8080,
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
