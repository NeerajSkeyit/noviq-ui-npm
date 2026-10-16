import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    setupFiles: ["./src/test/setup.ts"],
    // Tests drive real clicks through jsdom; on a busy machine the default 5s is too tight and a
    // slow test reads as a failing one.
    testTimeout: 20000,
    css: true,
    globals: true,
  },
});
