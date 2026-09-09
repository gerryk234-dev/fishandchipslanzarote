/* Production single-file build: the whole real app (talks to /api) inlined
   into one index.html, so the server can be updated by replacing one file. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: "dist-single", emptyOutDir: true },
});
