import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { Plugin } from "vite";

/**
 * Licence notices for the third-party code bundled into `dist/`.
 *
 * noviq-ui's build bundles its dependencies (only React is external), and the minifier drops their
 * licence comments. MIT, BSD, ISC and Apache-2.0 all require the notice to accompany copies of the
 * code, so the build writes `dist/THIRD-PARTY-NOTICES.md` — built from what actually ended up in
 * the bundle, not from what is merely installed.
 */

/** The three file-system calls this needs, so a test can hand it an in-memory tree. */
export interface FsLike {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
  readdirSync(path: string): string[];
}

const nodeFs: FsLike = { existsSync, readFileSync, readdirSync: (path) => readdirSync(path) };

/** `/a/node_modules/@s/pkg/dist/x.js` → `/a/node_modules/@s/pkg` (the innermost package), or `null`. */
export function packageRootOf(moduleId: string): string | null {
  const id = moduleId.replace(/^\0/, "").replace(/\?.*$/, "").replace(/\\/g, "/");
  const match = /^(.*\/node_modules\/(?:@[^/]+\/[^/]+|[^/@][^/]*))(?:\/|$)/.exec(id);
  return match ? match[1] : null;
}

/** Every package a set of module ids belongs to: each once, sorted. */
export function collectPackageRoots(moduleIds: Iterable<string>): string[] {
  const roots = new Set<string>();
  for (const id of moduleIds) {
    const root = packageRootOf(id);
    if (root) roots.add(root);
  }
  return [...roots].sort();
}

export interface LicenseText {
  file: string;
  text: string;
}

export interface BundledPackage {
  name: string;
  version: string;
  license: string;
  texts: LicenseText[];
}

/** `LICENSE`, `licence.md`, `LICENSE-MIT.txt`, `COPYING`, `NOTICE`… in a package's own directory. */
const LICENSE_FILE = /^(licen[sc]e|copying|notice)([-.].*)?$/i;

/** The licence field in any of the three forms packages have used. */
function declaredLicense(manifest: { license?: unknown; licenses?: unknown }): string {
  const { license, licenses } = manifest;
  if (typeof license === "string") return license;
  if (license && typeof license === "object" && "type" in license) return String((license as { type: unknown }).type);
  if (Array.isArray(licenses)) {
    const types = licenses.map((l) => (typeof l === "string" ? l : String((l as { type?: unknown }).type ?? ""))).filter(Boolean);
    if (types.length) return types.join(" OR ");
  }
  return "UNKNOWN";
}

/** Name from the path, for a package whose `package.json` can't be read. */
function nameFromRoot(root: string): string {
  const parts = root.split("/");
  const last = parts[parts.length - 1];
  const scope = parts[parts.length - 2];
  return scope?.startsWith("@") ? `${scope}/${last}` : last;
}

export function readBundledPackage(root: string, fs: FsLike = nodeFs): BundledPackage {
  let manifest: { name?: string; version?: string; license?: unknown; licenses?: unknown } = {};
  try {
    manifest = JSON.parse(fs.readFileSync(`${root}/package.json`, "utf8"));
  } catch {
    // keep going with what the path says: one unreadable package must not lose the other ninety
  }

  const texts: LicenseText[] = [];
  try {
    for (const file of fs.readdirSync(root).filter((name) => LICENSE_FILE.test(name)).sort()) {
      try {
        texts.push({ file, text: fs.readFileSync(`${root}/${file}`, "utf8").trim() });
      } catch {
        // a directory called LICENSE, say
      }
    }
  } catch {
    // no such directory
  }

  return {
    name: manifest.name ?? nameFromRoot(root),
    version: manifest.version ?? "unknown",
    license: declaredLicense(manifest),
    texts,
  };
}

/** A code fence long enough that nothing inside the text can close it. */
function fenced(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

/** The notices document: the header, then each package (alphabetically, once) with its licence texts. */
export function formatNotices(packages: BundledPackage[], header: string): string {
  const unique = new Map<string, BundledPackage>();
  for (const pkg of packages) unique.set(`${pkg.name}@${pkg.version}`, pkg);

  const sections = [...unique.values()]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.version < b.version ? -1 : a.version > b.version ? 1 : 0))
    .map((pkg) => {
      const lines = [`## ${pkg.name}@${pkg.version}`, "", `License: ${pkg.license}`];
      if (pkg.texts.length === 0) {
        lines.push("", `_No licence file is shipped with this package; its declared licence is ${pkg.license}._`);
      }
      for (const { file, text } of pkg.texts) lines.push("", `### ${file}`, "", fenced(text));
      return lines.join("\n");
    });

  return [header.trim(), ...sections].join("\n\n---\n\n") + "\n";
}

export interface NoticesOptions {
  /** The document's opening text. */
  header: string;
  /** Licence texts for code that was copied into the source rather than imported (icon shapes…). */
  extraFiles?: { title: string; path: string }[];
  fs?: FsLike;
}

/** Vite plugin: writes `THIRD-PARTY-NOTICES.md` into the build output. */
export function thirdPartyNoticesPlugin(options: NoticesOptions): Plugin {
  const fs = options.fs ?? nodeFs;
  return {
    name: "noviq-third-party-notices",
    generateBundle(_outputOptions, bundle) {
      const moduleIds: string[] = [];
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk") moduleIds.push(...Object.keys(item.modules));
      }

      const packages = collectPackageRoots(moduleIds).map((root) => readBundledPackage(root, fs));
      let source = formatNotices(packages, options.header);
      for (const { title, path } of options.extraFiles ?? []) {
        source += `\n---\n\n## ${title}\n\n${fenced(fs.readFileSync(path, "utf8").trim())}\n`;
      }

      this.emitFile({ type: "asset", fileName: "THIRD-PARTY-NOTICES.md", source });
    },
  };
}
