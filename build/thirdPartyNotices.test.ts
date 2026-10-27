import { describe, it, expect } from "vitest";
import {
  collectPackageRoots,
  formatNotices,
  packageRootOf,
  readBundledPackage,
  thirdPartyNoticesPlugin,
  type FsLike,
} from "./thirdPartyNotices";

/** An in-memory file system: `files` maps an absolute path to its text. */
function fakeFs(files: Record<string, string>): FsLike {
  return {
    existsSync: (path) => path in files || Object.keys(files).some((f) => f.startsWith(path + "/")),
    readFileSync: (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`);
      return files[path];
    },
    readdirSync: (dir) => {
      const prefix = dir.endsWith("/") ? dir : dir + "/";
      return [...new Set(Object.keys(files).filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length).split("/")[0]))];
    },
  };
}

describe("packageRootOf", () => {
  it("finds the package a module belongs to", () => {
    expect(packageRootOf("/app/node_modules/react-select/dist/react-select.esm.js")).toBe("/app/node_modules/react-select");
  });

  it("keeps the scope of a scoped package", () => {
    expect(packageRootOf("/app/node_modules/@emotion/react/dist/emotion-react.esm.js")).toBe("/app/node_modules/@emotion/react");
  });

  it("takes the innermost package when node_modules nest", () => {
    expect(packageRootOf("/app/node_modules/a/node_modules/b/lib/index.js")).toBe("/app/node_modules/a/node_modules/b");
    expect(packageRootOf("/app/node_modules/a/node_modules/@s/b/index.js")).toBe("/app/node_modules/a/node_modules/@s/b");
  });

  it("understands a pnpm-style store path", () => {
    expect(packageRootOf("/app/node_modules/.pnpm/memoize-one@6.0.0/node_modules/memoize-one/dist/m.js")).toBe(
      "/app/node_modules/.pnpm/memoize-one@6.0.0/node_modules/memoize-one"
    );
  });

  it("ignores rollup's virtual-module marker and query suffix", () => {
    expect(packageRootOf("\0/app/node_modules/xlsx-js-style/dist/xlsx.min.js?commonjs-module")).toBe("/app/node_modules/xlsx-js-style");
  });

  it("ignores a query on the package's own entry (a name followed by `?`, not `/`)", () => {
    expect(packageRootOf("/app/node_modules/memoize-one?commonjs-es-import")).toBe("/app/node_modules/memoize-one");
  });

  it("reads a Windows path", () => {
    expect(packageRootOf("C:\\app\\node_modules\\react-select\\dist\\x.js")).toBe("C:/app/node_modules/react-select");
  });

  it("is null for our own code and for virtual modules", () => {
    expect(packageRootOf("/app/src/components/Table/Table.tsx")).toBeNull();
    expect(packageRootOf("\0vite/preload-helper.js")).toBeNull();
    expect(packageRootOf("/app/node_modules/")).toBeNull();
  });
});

describe("collectPackageRoots", () => {
  it("lists each package once, sorted, whatever number of its files were bundled", () => {
    const roots = collectPackageRoots([
      "/a/node_modules/zeta/one.js",
      "/a/node_modules/alpha/one.js",
      "/a/node_modules/zeta/two.js",
      "/a/src/own.ts",
      "/a/node_modules/@s/mid/x.js",
    ]);
    expect(roots).toEqual(["/a/node_modules/@s/mid", "/a/node_modules/alpha", "/a/node_modules/zeta"]);
  });
});

describe("readBundledPackage", () => {
  const root = "/a/node_modules/pkg";

  it("reads the name, version, licence identifier and licence text", () => {
    const fs = fakeFs({
      [`${root}/package.json`]: JSON.stringify({ name: "pkg", version: "1.2.3", license: "MIT" }),
      [`${root}/LICENSE`]: "MIT text\nCopyright (c) Someone",
    });
    expect(readBundledPackage(root, fs)).toEqual({
      name: "pkg",
      version: "1.2.3",
      license: "MIT",
      texts: [{ file: "LICENSE", text: "MIT text\nCopyright (c) Someone" }],
    });
  });

  it("finds LICENCE, license.md, COPYING and NOTICE files, whatever the case", () => {
    const fs = fakeFs({
      [`${root}/package.json`]: JSON.stringify({ name: "pkg", version: "1.0.0", license: "Apache-2.0" }),
      [`${root}/license.md`]: "apache text",
      [`${root}/NOTICE`]: "notice text",
      [`${root}/README.md`]: "not a licence",
      [`${root}/dist/LICENSE`]: "nested, not the package's own",
    });
    const read = readBundledPackage(root, fs);
    expect(read.texts.map((t) => t.file).sort()).toEqual(["NOTICE", "license.md"]);
  });

  it("reads the older `{ type }` and `licenses[]` forms of the licence field", () => {
    const old = (license: object) => fakeFs({ [`${root}/package.json`]: JSON.stringify({ name: "p", version: "1.0.0", ...license }) });
    expect(readBundledPackage(root, old({ license: { type: "ISC" } })).license).toBe("ISC");
    expect(readBundledPackage(root, old({ licenses: [{ type: "MIT" }, { type: "Apache-2.0" }] })).license).toBe("MIT OR Apache-2.0");
  });

  it("says so when a package ships no licence file, instead of inventing one", () => {
    const fs = fakeFs({ [`${root}/package.json`]: JSON.stringify({ name: "pkg", version: "1.0.0", license: "MIT" }) });
    const read = readBundledPackage(root, fs);
    expect(read.texts).toEqual([]);
    expect(read.license).toBe("MIT");
  });

  it("does not stop at a package with no readable package.json", () => {
    expect(readBundledPackage("/a/node_modules/ghost", fakeFs({}))).toEqual({ name: "ghost", version: "unknown", license: "UNKNOWN", texts: [] });
  });

  it("names an unreadable scoped package with its scope", () => {
    expect(readBundledPackage("/a/node_modules/@s/ghost", fakeFs({})).name).toBe("@s/ghost");
  });
});

describe("formatNotices", () => {
  const pkgs = [
    { name: "zeta", version: "2.0.0", license: "MIT", texts: [{ file: "LICENSE", text: "zeta licence text" }] },
    { name: "@s/alpha", version: "1.0.0", license: "Apache-2.0", texts: [{ file: "LICENSE", text: "alpha licence" }, { file: "NOTICE", text: "alpha notice" }] },
    { name: "bare", version: "0.1.0", license: "ISC", texts: [] },
  ];

  it("starts with the header and lists packages alphabetically", () => {
    const out = formatNotices(pkgs, "# Third-party notices\n\nIntro text.");
    expect(out.startsWith("# Third-party notices\n\nIntro text.")).toBe(true);
    expect(out.indexOf("@s/alpha")).toBeLessThan(out.indexOf("bare@"));
    expect(out.indexOf("bare@")).toBeLessThan(out.indexOf("zeta@"));
  });

  it("gives each package its name, version, licence id and every text it shipped", () => {
    const out = formatNotices(pkgs, "# H");
    expect(out).toContain("## @s/alpha@1.0.0");
    expect(out).toContain("License: Apache-2.0");
    expect(out).toContain("alpha licence");
    expect(out).toContain("alpha notice");
    expect(out).toContain("zeta licence text");
  });

  it("marks a package with no licence file as such, naming its declared licence", () => {
    const out = formatNotices(pkgs, "# H");
    expect(out).toMatch(/## bare@0\.1\.0[\s\S]*License: ISC[\s\S]*no licence file/i);
  });

  it("lists each (name, version) once even if two roots resolved to it", () => {
    const out = formatNotices([pkgs[0], pkgs[0]], "# H");
    expect(out.match(/## zeta@2\.0\.0/g)).toHaveLength(1);
  });

  it("keeps a package's text intact, including backtick fences", () => {
    const tricky = [{ name: "t", version: "1.0.0", license: "MIT", texts: [{ file: "LICENSE", text: "before\n```\ninside\n```\nafter" }] }];
    const out = formatNotices(tricky, "# H");
    expect(out).toContain("before\n```\ninside\n```\nafter");
    // …and is fenced by something longer, so the ``` inside can't end the block early
    expect(out).toContain("````text\nbefore");
    expect(out).toContain("after\n````\n");
  });
});

describe("thirdPartyNoticesPlugin", () => {
  const fs = fakeFs({
    "/a/node_modules/react-select/package.json": JSON.stringify({ name: "react-select", version: "5.10.2", license: "MIT" }),
    "/a/node_modules/react-select/LICENSE": "react-select licence",
    "/a/node_modules/@emotion/react/package.json": JSON.stringify({ name: "@emotion/react", version: "11.14.0", license: "MIT" }),
    "/a/node_modules/@emotion/react/LICENSE": "emotion licence",
    "/a/node_modules/@babel/parser/package.json": JSON.stringify({ name: "@babel/parser", version: "7.0.0", license: "MIT" }),
    "/a/static/extra.txt": "static extra licence text",
  });

  function run(bundle: Record<string, unknown>, options = {}) {
    const emitted: { fileName: string; source: string }[] = [];
    const plugin = thirdPartyNoticesPlugin({ header: "# Notices", extraFiles: [{ title: "Extra", path: "/a/static/extra.txt" }], fs, ...options });
    (plugin.generateBundle as (this: unknown, o: unknown, b: unknown) => void).call(
      { emitFile: (file: { fileName: string; source: string }) => emitted.push(file) },
      {},
      bundle
    );
    return emitted;
  }

  const chunk = (...ids: string[]) => ({ type: "chunk", modules: Object.fromEntries(ids.map((id) => [id, {}])) });

  it("emits THIRD-PARTY-NOTICES.md listing the packages that ended up in a chunk", () => {
    const [file] = run({
      "noviq-ui.mjs": chunk("/a/node_modules/react-select/dist/x.js", "/a/node_modules/@emotion/react/dist/y.js", "/a/src/own.ts"),
    });
    expect(file.fileName).toBe("THIRD-PARTY-NOTICES.md");
    expect(file.source).toContain("react-select@5.10.2");
    expect(file.source).toContain("@emotion/react@11.14.0");
    expect(file.source).toContain("react-select licence");
  });

  it("does not list a package that was not bundled", () => {
    const [file] = run({ "noviq-ui.mjs": chunk("/a/node_modules/react-select/dist/x.js") });
    expect(file.source).not.toContain("@babel/parser");
  });

  it("gathers packages from every chunk, once each", () => {
    const [file] = run({
      "a.mjs": chunk("/a/node_modules/react-select/one.js"),
      "b.js": chunk("/a/node_modules/react-select/two.js", "/a/node_modules/@emotion/react/z.js"),
      "style.css": { type: "asset", source: "..." },
    });
    expect(file.source.match(/## react-select@/g)).toHaveLength(1);
    expect(file.source).toContain("@emotion/react");
  });

  it("appends the static notices it was given (code that was copied, not imported)", () => {
    const [file] = run({ "noviq-ui.mjs": chunk("/a/node_modules/react-select/x.js") });
    expect(file.source).toContain("Extra");
    expect(file.source).toContain("static extra licence text");
  });

  it("emits nothing for a bundle with no third-party code and no static notices", () => {
    const emitted = run({ "noviq-ui.mjs": chunk("/a/src/own.ts") }, { extraFiles: [] });
    expect(emitted).toHaveLength(1); // still a file: an empty list is a statement, not an omission
    expect(emitted[0].source).toContain("# Notices");
  });
});
