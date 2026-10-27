import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * What a package-health panel (and npm itself) reads to fill in "License", "Contributors",
 * "CONTRIBUTING", "Code of conduct": the package.json identity fields, and the community files at
 * the repository root. They went missing once (License "Unknown", Contributors 0, no files at all);
 * this keeps them from going missing again.
 */
const ROOT = process.cwd();
const read = (file: string) => readFileSync(resolve(ROOT, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const repoUrl: string = pkg.repository?.url ?? "";
/** `git+https://github.com/o/r.git` → `https://github.com/o/r` */
const repoWeb = repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");

describe("package.json identity", () => {
  it("declares a licence", () => {
    expect(pkg.license).toBe("UNLICENSED");
  });

  it("names its author, with a contact", () => {
    const author = typeof pkg.author === "string" ? pkg.author : `${pkg.author?.name} <${pkg.author?.email}>`;
    expect(author).toMatch(/\S+ <[^@\s]+@[^@\s]+\.[^@\s]+>/);
  });

  it("points at its repository — how a panel finds the contributors", () => {
    expect(pkg.repository?.type).toBe("git");
    expect(repoUrl).toMatch(/^git\+https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/);
  });

  it("links the homepage and the issue tracker to that same repository", () => {
    expect(pkg.homepage).toBe(`${repoWeb}#readme`);
    expect(pkg.bugs?.url).toBe(`${repoWeb}/issues`);
  });

  it("is still publishable", () => {
    expect(pkg.private).toBe(false);
  });
});

describe("the community files", () => {
  it.each(["LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"])("%s exists and is not empty", (file) => {
    expect(existsSync(resolve(ROOT, file))).toBe(true);
    expect(read(file).trim().length).toBeGreaterThan(200);
  });

  it("LICENSE says whose it is, that rights are reserved, and where third-party terms are", () => {
    const text = read("LICENSE");
    expect(text).toMatch(/Copyright \(c\) \d{4} Satellite Key IT/);
    expect(text).toMatch(/All rights reserved/i);
    expect(text).toContain("THIRD-PARTY-NOTICES.md");
    expect(text).toMatch(/AS IS/);
  });

  it("CODE_OF_CONDUCT gives a way to report, and credits the Contributor Covenant", () => {
    const text = read("CODE_OF_CONDUCT.md");
    const email = typeof pkg.author === "string" ? /<([^>]+)>/.exec(pkg.author)?.[1] : pkg.author?.email;
    expect(email).toBeTruthy();
    expect(text).toContain(email);
    expect(text).toMatch(/Contributor Covenant/);
    expect(text).toMatch(/version 2\.1/i);
  });

  it("CONTRIBUTING explains how to run the checks and points at the code of conduct", () => {
    const text = read("CONTRIBUTING.md");
    expect(text).toContain("CODE_OF_CONDUCT.md");
    for (const command of ["npx tsc --noEmit", "npx vitest run", "npm run build"]) expect(text).toContain(command);
    expect(text).toMatch(/Satellite Key IT/);
  });

  it("the README links all three, so they are findable from the npm page", () => {
    const readme = read("README.md");
    for (const file of ["LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"]) {
      expect(readme, file).toContain(`](${file})`);
    }
    expect(readme).toMatch(/Third-party notices/i);
  });

  it("ships the third-party notices inside dist/ (so they travel with the code they cover)", () => {
    expect(pkg.files).toContain("dist");
  });
});
