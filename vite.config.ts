import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
// For GitHub Pages: if GITHUB_PAGES env var is set and we have a repo name, use /repo-name/
// Otherwise use / (for Vercel, local dev, or root domain deployments)
// GITHUB_REPOSITORY is automatically set by GitHub Actions in the format: owner/repo
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const base =
  isGitHubPages && repoName ? `/${repoName}/` : process.env.BASE_URL || "/";

export default defineConfig(({ mode }) => ({
  // For GitHub Pages: if deployed to https://username.github.io/repo-name/
  // base must be "/repo-name/". For root domain, use "/"
  base,
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "./public", "./node_modules"],
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
  plugins: [react(), expressPlugin(), copyJsonPlugin()],
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
      // Lazy load server module only during development
      const { createServer } = require("./server");
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}

// Copy JSON files from public folder to build output
// This ensures movement-data.json and never-moved-cows.json are available at build root
// Note: Vite's public folder is automatically copied to build root, but this plugin
// ensures the JSON files are explicitly included for better reliability
function copyJsonPlugin(): Plugin {
  const fs = require("fs");
  return {
    name: "copy-json-plugin",
    apply: "build", // Only apply during production build
    generateBundle() {
      // Read JSON files from public folder
      const publicPath = path.resolve(__dirname, "public");
      const jsonFiles = ["movement-data.json", "never-moved-cows.json"];

      for (const file of jsonFiles) {
        const filePath = path.join(publicPath, file);
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          // Add to build output
          this.emitFile({
            type: "asset",
            fileName: file,
            source: content,
          });
          console.log(`✅ Copied ${file} to build output`);
        } catch (error) {
          console.warn(`⚠️  Could not copy ${file} (may already be in public):`, error.message);
        }
      }
    },
  };
}
