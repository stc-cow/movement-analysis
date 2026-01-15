import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Main from "./pages/Main";
import Dashboard from "./pages/Dashboard";
import AIMovement from "./pages/AIMovement";
import AIChatAgent from "./pages/AIChatAgent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Track root creation to prevent duplicate createRoot calls during HMR
declare global {
  var __APP_ROOT__: any;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  // Critical: Root element is missing from HTML
  console.error(
    "❌ CRITICAL ERROR: #root element not found in HTML. The app cannot mount.",
  );
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(to bottom right, #1e293b, #0f172a); color: white; font-family: sans-serif;">
      <div style="text-align: center; max-width: 600px; padding: 40px;">
        <h1 style="font-size: 28px; margin-bottom: 16px;">⚠️ App Initialization Failed</h1>
        <p style="font-size: 16px; color: #cbd5e1; margin-bottom: 24px;">
          The HTML root element (#root) is missing from index.html
        </p>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; text-align: left; font-size: 12px; color: #fca5a5;">
          <p style="font-weight: bold; margin-bottom: 8px;">Fix:</p>
          <p>Ensure index.html contains: &lt;div id="root"&gt;&lt;/div&gt;</p>
        </div>
      </div>
    </div>
  `;
} else {
  if (!globalThis.__APP_ROOT__) {
    globalThis.__APP_ROOT__ = createRoot(rootElement);
  }
  globalThis.__APP_ROOT__.render(<App />);
}
