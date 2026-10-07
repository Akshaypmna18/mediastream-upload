import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** GitHub Pages project site: https://akshaypmna18.github.io/mediastream-upload/ */
export default defineConfig({
  plugins: [react()],
  base: "/mediastream-upload/",
  server: {
    port: 5174,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
