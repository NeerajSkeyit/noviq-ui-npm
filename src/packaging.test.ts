import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shippedSourceFiles } from "./test/sourceFiles";

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

describe("runtime dependencies", () => {
  // Both are the consumer's choice, not the library's. `Form` is typed structurally against
  // { values, errors, touched, setFieldValue } and Table export feedback goes through
  // config.notify, so neither is imported by shipped code.
  const NOT_RUNTIME_DEPS = ["formik", "react-hot-toast"];

  it.each(NOT_RUNTIME_DEPS)("does not list %s under dependencies or peerDependencies", (name) => {
    expect(pkg.dependencies ?? {}).not.toHaveProperty(name);
    expect(pkg.peerDependencies ?? {}).not.toHaveProperty(name);
  });

  it.each(NOT_RUNTIME_DEPS)("shipped source never imports %s, even as a type", (name) => {
    const importer = new RegExp(`(from|import)\\s*\\(?\\s*["']${name}["']`);
    const offenders = shippedSourceFiles().filter((file) =>
      importer.test(readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});
