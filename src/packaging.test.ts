import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

describe("package.json exports", () => {
  // With `moduleResolution: "bundler"` (the Vite default) or "node16", TypeScript resolves a
  // package through its `exports` map and ignores the top-level `types` field — so without a
  // `types` condition here, every typed consumer gets the whole library as implicit `any`
  // (TS7016). This went unnoticed for several releases because noviq-ui's own tests and dev
  // playground import from local source, never through the package boundary.
  it('declares a "types" condition on the root export', () => {
    const root = pkg.exports["."];
    expect(typeof root).toBe("object");
    expect(root.types).toBe("./dist/index.d.ts");
  });

  it("keeps the top-level types field in sync with the exports types condition", () => {
    expect(pkg.types).toBe(pkg.exports["."].types);
  });

  it('puts "types" first, since condition order matters to resolvers', () => {
    expect(Object.keys(pkg.exports["."])[0]).toBe("types");
  });
});
