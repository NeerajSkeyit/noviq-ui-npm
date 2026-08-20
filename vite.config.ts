import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [react(), dts()],
  server: {
    port: 5176,
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "noviq-ui",
      formats: ["es"],
      fileName: () => "noviq-ui.mjs",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      output: {
        format: "es",
        codeSplitting: true,
      },
    },
  },
});
