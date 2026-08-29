import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { analyzeRepositoryContext, analyzeRepositoryFiles, parsePublicGitHubRepository, scanPublicGitHubRepository } from "./repositoryScanner";

const repository = parsePublicGitHubRepository("https://github.com/example/crypto-service");

describe("repository scanner MVP", () => {
  it("collects bounded non-cryptographic context signals without collecting secrets", () => {
    const signals = analyzeRepositoryContext([
      { path: "src/app.ts", content: "const token = process.env.API_TOKEN; await fetch('https://api.example.test');" },
      { path: "src/auth.ts", content: "export function login() { return session; }" },
      { path: "src/db.ts", content: "const db = process.env.DATABASE_URL;" },
    ]);
    expect(signals.map(signal => signal.id)).toEqual(expect.arrayContaining(["authentication", "data-store", "external-service", "environment-reference"]));
    expect(JSON.stringify(signals)).not.toContain("API_TOKEN");
  });

  it("only accepts a public HTTPS GitHub repository root", () => {
    expect(repository).toMatchObject({ owner: "example", repository: "crypto-service" });
    expect(() => parsePublicGitHubRepository("http://github.com/example/repo")).toThrow("Only standard HTTPS");
    expect(() => parsePublicGitHubRepository("https://github.com/example/repo/tree/main")).toThrow("repository root URL");
    expect(() => parsePublicGitHubRepository("https://127.0.0.1/example/repo")).toThrow("Only standard HTTPS");
  });

  it("finds supported crypto patterns in a local source fixture without executing content", () => {
    const findings = analyzeRepositoryFiles(repository, "main", [
      { path: "src/transport.ts", content: "import { createCipheriv } from 'node:crypto';\nconst cipher = createCipheriv('aes-256-gcm', key, iv);" },
      { path: "src/keys.py", content: "from cryptography.hazmat.primitives.asymmetric import rsa\nkey = rsa.generate_private_key(public_exponent=65537, key_size=2048)" },
      { path: "src/ignored.txt", content: "createCipheriv('aes-256-gcm', key, iv)" },
    ]);
    expect(findings).toHaveLength(2);
    expect(findings.map(finding => finding.algorithm)).toEqual(["AES-GCM", "RSA"]);
    expect(findings[0]?.sourceLocation).toContain("src/transport.ts:2");
    expect(findings[1]?.quantumVulnerable).toBe(true);
    expect(findings.every(finding => finding.evidence.includes("not executed"))).toBe(true);
  });

  it("detects wrapper libraries, dependency declarations, and configuration keys without retaining secret values", () => {
    const findings = analyzeRepositoryFiles(repository, "main", [
      { path: "backend/app/security.py", content: "from passlib.context import CryptContext\ncontext = CryptContext(schemes=['argon2'])\nimport jwt\ntoken = jwt.encode(payload, key, algorithm='HS256')" },
      { path: "requirements.txt", content: "passlib==1.7.4\nPyJWT>=2.8.0\nargon2-cffi==23.1.0" },
      { path: ".env", content: "JWT_SECRET=do-not-retain-this-value" },
    ]);
    expect(findings.map(finding => finding.algorithm)).toEqual(expect.arrayContaining(["argon2", "HS256", "Password hashing scheme not observed", "JWT algorithm not observed", "Argon2", "JWT configuration parameter not observed"]));
    expect(findings.some(finding => finding.assetType === "Dependency manifest")).toBe(true);
    expect(findings.some(finding => finding.assetType === "Configuration file")).toBe(true);
    expect(findings.every(finding => !finding.evidence.includes("do-not-retain-this-value"))).toBe(true);
  });

  it("creates bounded unique finding keys for long paths that share a prefix", () => {
    const findings = analyzeRepositoryFiles(repository, "main", [
      { path: "services/authentication/very-long-common-prefix-module-a/crypto.py", content: "from passlib.context import CryptContext" },
      { path: "services/authentication/very-long-common-prefix-module-b/crypto.py", content: "from passlib.context import CryptContext" },
    ]);
    expect(findings).toHaveLength(2);
    expect(new Set(findings.map(finding => finding.findingKey)).size).toBe(2);
    expect(findings.every(finding => finding.findingKey.length <= 48)).toBe(true);
  });

  it("recognizes expanded language, manifest, and safe configuration indicators", () => {
    const findings = analyzeRepositoryFiles(repository, "main", [
      { path: "src/token.ts", content: "import jwt from 'jsonwebtoken';\nconst digest = createHash('sha256');" },
      { path: "src/security.py", content: "import hashlib\nvalue = hashlib.sha256(b'payload')\nfrom cryptography.fernet import Fernet" },
      { path: "src/signing.java", content: "Signature.getInstance('SHA256withECDSA');" },
      { path: "src/transport.rs", content: "use ring::signature;" },
      { path: "Cargo.toml", content: "[dependencies]\nring = '0.17'" },
      { path: ".env.example", content: "CIPHERS=RC4-SHA\nJWT_SECRET=example" },
    ]);
    expect(findings.map(finding => finding.algorithm)).toEqual(expect.arrayContaining(["JWT algorithm not observed", "sha256", "Fernet", "ECDSA", "Rust crypto primitive not observed", "Rust crypto package parameters not observed", "Potentially weak cipher configuration"]));
    expect(findings.every(finding => !finding.evidence.includes("JWT_SECRET=example"))).toBe(true);
  });

  it("uses bounded GitHub metadata and raw-source requests without cloning repositories", async () => {
    const requests: string[] = [];
    const fetcher = async (url: string) => {
      requests.push(url);
      if (url.includes("/repos/example/crypto-service") && !url.includes("/git/trees/")) return { ok: true, status: 200, json: async () => ({ default_branch: "main" }), text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) };
      if (url.includes("/git/trees/")) return { ok: true, status: 200, json: async () => ({ tree: [{ path: "src/main.go", type: "blob", size: 80 }, { path: "node_modules/x.js", type: "blob", size: 12 }] }), text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, status: 200, json: async () => ({}), text: async () => "package main\nfunc main() { aes.NewCipher(key) }", arrayBuffer: async () => new ArrayBuffer(0) };
    };
    const result = await scanPublicGitHubRepository("https://github.com/example/crypto-service", fetcher);
    expect(result.scannedFileCount).toBe(1);
    expect(result.findings[0]?.algorithm).toBe("AES");
    expect(requests).toHaveLength(3);
    expect(requests.some(request => request.includes("git clone"))).toBe(false);
  });

  it("prioritizes small allowed manifest files in the bounded GitHub request set", async () => {
    const requests: string[] = [];
    const fetcher = async (url: string) => {
      requests.push(url);
      if (url.includes("/repos/example/crypto-service") && !url.includes("/git/trees/")) return { ok: true, status: 200, json: async () => ({ default_branch: "main" }), text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) };
      if (url.includes("/git/trees/")) return { ok: true, status: 200, json: async () => ({ tree: [{ path: "requirements.txt", type: "blob", size: 30 }, { path: "src/app.py", type: "blob", size: 80 }] }), text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, status: 200, json: async () => ({}), text: async () => url.endsWith("requirements.txt") ? "PyJWT>=2.8" : "import jwt", arrayBuffer: async () => new ArrayBuffer(0) };
    };
    const result = await scanPublicGitHubRepository("https://github.com/example/crypto-service", fetcher);
    expect(result.scannedFileCount).toBe(2);
    expect(result.findings.some(finding => finding.assetType === "Dependency manifest")).toBe(true);
    expect(requests.some(request => request.endsWith("requirements.txt"))).toBe(true);
  });

  it("falls back to a bounded GitHub archive when metadata is rate limited", async () => {
    const archive = zipSync({ "crypto-service-main/src/main.go": strToU8("package main\nfunc main() { aes.NewCipher(key) }") });
    const fetcher = async (url: string) => {
      if (url.startsWith("https://api.github.com/")) return { ok: false, status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1787754000" }, json: async () => ({}), text: async () => "rate limited", arrayBuffer: async () => new ArrayBuffer(0) };
      if (url === "https://github.com/example/crypto-service") return { ok: true, status: 200, json: async () => ({}), text: async () => '<script type="application/json">{"defaultBranch":"main"}</script>', arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, status: 200, json: async () => ({}), text: async () => "", arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) };
    };
    const result = await scanPublicGitHubRepository("https://github.com/example/crypto-service", fetcher);
    expect(result.branch).toBe("main");
    expect(result.findings[0]?.algorithm).toBe("AES");
  });
});
