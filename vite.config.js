import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite inlines VITE_* variables at build time. If one is missing, the bundle
// ships with an undefined Supabase URL/key and every page fails at load (see
// the guards in src/utils/Supabase.js). Fail the build here instead — with an
// actionable message — so a misconfigured dev / uat / production deploy never
// reaches the browser. Each branch is expected to supply its own values.
const REQUIRED_CLIENT_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

function assertClientEnv(mode) {
  // Prefix "" so process.env (the host's build environment, e.g. Netlify or
  // Cloudflare Pages) is merged in alongside the local .env files.
  const env = loadEnv(mode, process.cwd(), "");
  const missing = REQUIRED_CLIENT_ENV.filter((key) => !String(env[key] ?? "").trim());

  if (missing.length > 0) {
    throw new Error(
      `[Place4U] Missing required build-time environment variable(s): ${missing.join(", ")}.\n` +
        "Set them in .env (local) or the host's build environment, then rebuild. " +
        "See .env.example for the full list."
    );
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  assertClientEnv(mode);

  return {
    plugins: [tailwindcss(), react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-charts": ["recharts"],
            "vendor-framer": ["framer-motion"],
            "vendor-supabase": ["@supabase/supabase-js"],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
