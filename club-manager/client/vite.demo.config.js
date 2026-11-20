/* Demo build: everything inlined into a single HTML file, API served by
   the in-browser mock (mockApi.js). Used for shareable previews. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { "import.meta.env.VITE_DEMO": JSON.stringify("1") },
  build: { outDir: "dist-demo", emptyOutDir: true },
});
