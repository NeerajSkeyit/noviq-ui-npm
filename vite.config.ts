import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { thirdPartyNoticesPlugin } from "./build/thirdPartyNotices";

// Dependencies are bundled into dist (only React is external) and the minifier drops their licence
// comments, so the build writes dist/THIRD-PARTY-NOTICES.md from what was actually bundled.
const NOTICES_HEADER = `# Third-party notices

noviq-ui bundles the open-source packages listed below into \`dist/\`. Each is licensed under its own
terms, which are reproduced here as those terms require. noviq-ui's own code is proprietary to
Satellite Key IT Solutions — see \`LICENSE\`.

The icon shapes in \`src/components/Icon/icons.ts\` are copied from Lucide; its licence (ISC, plus the
MIT terms for the icons derived from Feather) is at the end of this file.`;

export default defineConfig({
  plugins: [
    react(),
    dts(),
    thirdPartyNoticesPlugin({
      header: NOTICES_HEADER,
      extraFiles: [
        {
          title: "Lucide icon shapes",
          path: fileURLToPath(
            new URL("./build/lucide-LICENSE.txt", import.meta.url)
          ),
        },
      ],
    }),
  ],
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
