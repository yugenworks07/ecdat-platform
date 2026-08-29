import { type SeedFinding } from "../ecdatSeed";
import { evaluateFindingRisk } from "../ecdatRisk";
import { Unzip, UnzipInflate } from "fflate";
import { createHash } from "node:crypto";
import { deduplicateRepositoryFindings } from "./repositoryDeduplication";
import type { RepositoryContextSignal } from "../../shared/repositoryOutcome";

const MAX_FILES = 40;
const MAX_FILE_BYTES = 120_000;
const MAX_TOTAL_BYTES = 600_000;
const MAX_ARCHIVE_BYTES = 3_000_000;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java", ".go", ".c", ".h", ".cpp", ".hpp", ".rs"]);
const ANALYSIS_FILENAMES = new Set([
  "requirements.txt", "pipfile", "pyproject.toml", "setup.cfg", "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "pom.xml", "build.gradle", "build.gradle.kts", "go.mod", "go.sum", "gemfile", "cargo.toml", "dockerfile", "docker-compose.yml",
  "docker-compose.yaml", ".env", ".env.example", "nginx.conf", "nginx.cfg", "httpd.conf", ".htaccess", "application.yml", "application.yaml", "application.properties",
]);
const EXCLUDED_PATH_SEGMENTS = new Set([".git", "node_modules", "vendor", "dist", "build", "coverage"]);

export type PublicGitHubRepository = {
  owner: string;
  repository: string;
  canonicalUrl: string;
};

export type RepositorySourceFile = { path: string; content: string };
export type RepositoryScanResult = {
  repository: PublicGitHubRepository;
  branch: string;
  findings: SeedFinding[];
  scannedFileCount: number;
  skippedFileCount: number;
  contextSignals?: RepositoryContextSignal[];
  coverageIncomplete?: boolean;
};

type StaticRule = {
  id: string;
  extensions: string[];
  expression: RegExp;
  algorithm: string;
  cryptoRole: string;
  library: string;
  quantumVulnerable: boolean;
  quantumRisk: string;
  classicalRisk: string;
  usageContext: string;
  confidence?: number;
  deriveAlgorithm?: (content: string) => string;
  dataLifetimeYears?: number;
  migrationMonths?: number;
};

const STATIC_RULES: StaticRule[] = [
  { id: "node-aes-gcm", extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], expression: /createCipheriv\s*\(\s*["'`]aes-(?:128|192|256)-gcm["'`]/i, algorithm: "AES-GCM", cryptoRole: "Encryption", library: "Node.js crypto", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Authenticated encryption call detected", dataLifetimeYears: 7, migrationMonths: 6 },
  { id: "node-rsa", extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], expression: /(?:generateKeyPair|createSign|publicEncrypt)\s*\(\s*["'`]rsa/i, algorithm: "RSA", cryptoRole: "Signature or key establishment", library: "Node.js crypto", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "RSA cryptographic operation detected", dataLifetimeYears: 15, migrationMonths: 18 },
  { id: "webcrypto-rsa", extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], expression: /(?:RSA-OAEP|RSASSA-PKCS1-v1_5|RSA-PSS)/i, algorithm: "RSA", cryptoRole: "Encryption or signature", library: "Web Crypto API", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Web Crypto RSA algorithm identifier detected", dataLifetimeYears: 15, migrationMonths: 18 },
  { id: "python-aesgcm", extensions: [".py"], expression: /\bAESGCM\s*\(/, algorithm: "AES-GCM", cryptoRole: "Encryption", library: "cryptography", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Python AES-GCM construction detected", dataLifetimeYears: 7, migrationMonths: 6 },
  { id: "python-rsa", extensions: [".py"], expression: /rsa\.generate_private_key\s*\(/, algorithm: "RSA", cryptoRole: "Key establishment or signature", library: "cryptography", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Python RSA key generation detected", dataLifetimeYears: 15, migrationMonths: 18 },
  { id: "python-passlib", extensions: [".py"], expression: /(?:from\s+passlib(?:\.|\s+import)|import\s+passlib|CryptContext\s*\()/i, algorithm: "Password hashing scheme not observed", cryptoRole: "Password hashing", library: "passlib", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "passlib wrapper-library usage detected", confidence: 85, deriveAlgorithm: content => content.match(/(?:schemes\s*=\s*\[|scheme\s*=\s*["'])(?:\s*["'])?([A-Za-z0-9_-]+)/i)?.[1] ?? "Password hashing scheme not observed", dataLifetimeYears: 5, migrationMonths: 3 },
  { id: "python-pyjwt", extensions: [".py"], expression: /(?:import\s+jwt\b|from\s+jwt\s+import|from\s+PyJWT\b|jwt\.(?:encode|decode)\s*\()/i, algorithm: "JWT algorithm not observed", cryptoRole: "Token signature", library: "PyJWT", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "PyJWT wrapper-library usage detected", confidence: 88, deriveAlgorithm: content => content.match(/algorithm\s*=\s*["']([A-Za-z0-9-]+)["']/i)?.[1] ?? "JWT algorithm not observed", dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "python-argon2", extensions: [".py"], expression: /(?:from\s+argon2\b|import\s+argon2\b)/i, algorithm: "Argon2", cryptoRole: "Password hashing", library: "argon2-cffi", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Argon2 wrapper-library usage detected", confidence: 92, dataLifetimeYears: 5, migrationMonths: 3 },
  { id: "python-jose", extensions: [".py"], expression: /(?:from\s+jose\b|import\s+jose\b|from\s+python_jwt\b)/i, algorithm: "JOSE algorithm not observed", cryptoRole: "Token signature", library: "JOSE", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "JOSE wrapper-library usage detected", confidence: 86, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "python-ssl", extensions: [".py"], expression: /(?:from\s+ssl\s+import|import\s+ssl\b|from\s+OpenSSL\b|import\s+OpenSSL\b|import\s+paramiko\b)/i, algorithm: "TLS or SSH parameters not observed", cryptoRole: "Transport security", library: "Python SSL wrapper", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Python transport-security wrapper usage detected", confidence: 78, dataLifetimeYears: 10, migrationMonths: 12 },
  { id: "java-aes-gcm", extensions: [".java"], expression: /Cipher\.getInstance\s*\(\s*["'`]AES\/GCM/i, algorithm: "AES-GCM", cryptoRole: "Encryption", library: "Java Cryptography Architecture", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Java AES-GCM cipher construction detected", dataLifetimeYears: 7, migrationMonths: 6 },
  { id: "java-rsa", extensions: [".java"], expression: /(?:KeyPairGenerator|Signature)\.getInstance\s*\(\s*["'`](?:RSA|SHA\d+withRSA)/i, algorithm: "RSA", cryptoRole: "Key establishment or signature", library: "Java Cryptography Architecture", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Java RSA primitive selection detected", dataLifetimeYears: 15, migrationMonths: 18 },
  { id: "go-aes", extensions: [".go"], expression: /aes\.NewCipher\s*\(/, algorithm: "AES", cryptoRole: "Encryption", library: "Go crypto", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Go AES cipher construction detected", dataLifetimeYears: 7, migrationMonths: 6 },
  { id: "go-rsa", extensions: [".go"], expression: /rsa\.(?:GenerateKey|EncryptOAEP|Sign)/, algorithm: "RSA", cryptoRole: "Key establishment or signature", library: "Go crypto", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Go RSA operation detected", dataLifetimeYears: 15, migrationMonths: 18 },
  { id: "go-ecdsa", extensions: [".go"], expression: /ecdsa\.(?:GenerateKey|Sign|Verify)/, algorithm: "ECDSA", cryptoRole: "Signature", library: "Go crypto", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Go ECDSA operation detected", dataLifetimeYears: 12, migrationMonths: 15 },
  { id: "node-hash", extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], expression: /createHash\s*\(\s*["'`](?:sha(?:1|224|256|384|512)|md5)["'`]/i, algorithm: "Hash algorithm observed", cryptoRole: "Hashing", library: "Node.js crypto", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Medium", usageContext: "Node.js hash operation detected", confidence: 90, deriveAlgorithm: content => content.match(/createHash\s*\(\s*["'`]([^"'`]+)["'`]/i)?.[1] ?? "Hash algorithm observed", dataLifetimeYears: 5, migrationMonths: 6 },
  { id: "node-ecdh", extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], expression: /createECDH\s*\(/i, algorithm: "ECDH curve not observed", cryptoRole: "Key establishment", library: "Node.js crypto", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Node.js ECDH operation detected", confidence: 88, dataLifetimeYears: 12, migrationMonths: 15 },
  { id: "node-jose", extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], expression: /(?:jsonwebtoken|from\s+["'`]jose|require\s*\(\s*["'`]jsonwebtoken|jwt\.(?:sign|verify))\b/i, algorithm: "JWT algorithm not observed", cryptoRole: "Token signature", library: "JavaScript JWT library", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "JavaScript JWT wrapper usage detected", confidence: 84, deriveAlgorithm: content => content.match(/algorithm\s*:\s*["'`]([A-Za-z0-9-]+)["'`]/i)?.[1] ?? "JWT algorithm not observed", dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "python-hashlib", extensions: [".py"], expression: /hashlib\.(?:md5|sha1|sha224|sha256|sha384|sha512)\s*\(/i, algorithm: "Python hash algorithm observed", cryptoRole: "Hashing", library: "hashlib", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Medium", usageContext: "Python hashlib operation detected", confidence: 90, deriveAlgorithm: content => content.match(/hashlib\.(md5|sha1|sha224|sha256|sha384|sha512)\s*\(/i)?.[1]?.toUpperCase() ?? "Python hash algorithm observed", dataLifetimeYears: 5, migrationMonths: 6 },
  { id: "python-bcrypt", extensions: [".py"], expression: /(?:import\s+bcrypt\b|from\s+bcrypt\b|bcrypt\.(?:hashpw|checkpw))/i, algorithm: "bcrypt", cryptoRole: "Password hashing", library: "bcrypt", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Python bcrypt usage detected", confidence: 90, dataLifetimeYears: 5, migrationMonths: 3 },
  { id: "python-fernet", extensions: [".py"], expression: /(?:from\s+cryptography\.fernet\s+import\s+Fernet|\bFernet\s*\()/i, algorithm: "Fernet", cryptoRole: "Encryption", library: "cryptography", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Python Fernet construction detected", confidence: 90, dataLifetimeYears: 7, migrationMonths: 6 },
  { id: "java-ecdsa", extensions: [".java"], expression: /Signature\.getInstance\s*\(\s*["'`]SHA\d+withECDSA/i, algorithm: "ECDSA", cryptoRole: "Signature", library: "Java Cryptography Architecture", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Java ECDSA primitive selection detected", dataLifetimeYears: 12, migrationMonths: 15 },
  { id: "java-hash", extensions: [".java"], expression: /MessageDigest\.getInstance\s*\(\s*["'`](?:SHA-?\d+|MD5)["'`]/i, algorithm: "Java hash algorithm observed", cryptoRole: "Hashing", library: "Java Cryptography Architecture", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Medium", usageContext: "Java message digest selection detected", confidence: 88, dataLifetimeYears: 5, migrationMonths: 6 },
  { id: "go-hash", extensions: [".go"], expression: /(?:sha256|sha512|md5)\.(?:New|Sum\d+)/, algorithm: "Go hash algorithm observed", cryptoRole: "Hashing", library: "Go crypto", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Medium", usageContext: "Go hash operation detected", confidence: 86, dataLifetimeYears: 5, migrationMonths: 6 },
  { id: "openssl-evp", extensions: [".c", ".h", ".cpp", ".hpp"], expression: /EVP_(?:aes|sha|Encrypt|Decrypt|Digest)_/i, algorithm: "OpenSSL primitive not observed", cryptoRole: "Cryptographic primitive", library: "OpenSSL", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "OpenSSL EVP API usage detected", confidence: 78, dataLifetimeYears: 7, migrationMonths: 9 },
  { id: "rust-ring", extensions: [".rs"], expression: /(?:ring::(?:aead|signature|digest)|aes_gcm::|rsa::)/i, algorithm: "Rust crypto primitive not observed", cryptoRole: "Cryptographic primitive", library: "Rust crypto library", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Rust cryptography library usage detected", confidence: 78, dataLifetimeYears: 7, migrationMonths: 9 },
  { id: "rust-rsa", extensions: [".rs"], expression: /rsa::(?:pkcs1v15|pkcs8|jwt|oaep)/i, algorithm: "RSA", cryptoRole: "Signature or encryption", library: "Rust rsa crate", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Rust RSA operation detected", dataLifetimeYears: 15, migrationMonths: 18 },
  { id: "rust-ring-aead", extensions: [".rs"], expression: /ring::aead::(?:SealingKey|OpeningKey|LessSafeKey|Nonce::)/i, algorithm: "AES-GCM (ring)", cryptoRole: "Authenticated encryption", library: "ring crate", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Medium", usageContext: "Ring AEAD construction detected; verify nonce uniqueness", dataLifetimeYears: 7, migrationMonths: 6 },
  { id: "rust-ecdsa", extensions: [".rs"], expression: /ecdsa::(?:SigningKey|VerifyingKey|Signature)/i, algorithm: "ECDSA", cryptoRole: "Signature", library: "Rust ecdsa crate", quantumVulnerable: true, quantumRisk: "High", classicalRisk: "Low", usageContext: "Rust ECDSA operation detected", dataLifetimeYears: 12, migrationMonths: 15 },
];

type DependencyRule = Omit<StaticRule, "extensions" | "expression" | "deriveAlgorithm"> & { packages: string[]; manifestNames: string[] };

const DEPENDENCY_RULES: DependencyRule[] = [
  { id: "manifest-passlib", packages: ["passlib"], manifestNames: ["requirements.txt", "pyproject.toml", "setup.cfg"], algorithm: "Password hashing scheme not observed", cryptoRole: "Password hashing", library: "passlib", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Dependency manifest declares passlib", confidence: 72, dataLifetimeYears: 5, migrationMonths: 3 },
  { id: "manifest-pyjwt", packages: ["pyjwt"], manifestNames: ["requirements.txt", "pyproject.toml", "setup.cfg"], algorithm: "JWT algorithm not observed", cryptoRole: "Token signature", library: "PyJWT", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares PyJWT", confidence: 76, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "manifest-argon2", packages: ["argon2-cffi", "argon2_cffi"], manifestNames: ["requirements.txt", "pyproject.toml", "setup.cfg"], algorithm: "Argon2", cryptoRole: "Password hashing", library: "argon2-cffi", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Dependency manifest declares Argon2 support", confidence: 80, dataLifetimeYears: 5, migrationMonths: 3 },
  { id: "manifest-jose", packages: ["python-jose", "jose"], manifestNames: ["requirements.txt", "pyproject.toml", "setup.cfg", "package.json"], algorithm: "JOSE algorithm not observed", cryptoRole: "Token signature", library: "JOSE", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares JOSE support", confidence: 74, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "manifest-bcrypt", packages: ["bcrypt"], manifestNames: ["requirements.txt", "pyproject.toml", "setup.cfg", "package.json"], algorithm: "bcrypt", cryptoRole: "Password hashing", library: "bcrypt", quantumVulnerable: false, quantumRisk: "Low", classicalRisk: "Low", usageContext: "Dependency manifest declares bcrypt", confidence: 82, dataLifetimeYears: 5, migrationMonths: 3 },
  { id: "manifest-crypto-js", packages: ["crypto-js", "node-forge", "jsonwebtoken"], manifestNames: ["package.json"], algorithm: "Cryptographic package parameters not observed", cryptoRole: "Cryptographic library", library: "JavaScript crypto package", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares a JavaScript cryptographic package", confidence: 72, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "manifest-bouncycastle", packages: ["bouncycastle", "nimbus-jose-jwt", "spring-security-crypto"], manifestNames: ["pom.xml", "build.gradle"], algorithm: "JVM cryptographic package parameters not observed", cryptoRole: "Cryptographic library", library: "JVM crypto package", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares a JVM cryptographic package", confidence: 72, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "manifest-go-crypto", packages: ["golang.org/x/crypto"], manifestNames: ["go.mod"], algorithm: "Go x/crypto", cryptoRole: "Cryptographic library", library: "golang.org/x/crypto", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares Go extended crypto", confidence: 76, dataLifetimeYears: 7, migrationMonths: 9 },
  { id: "manifest-python-cryptography", packages: ["cryptography", "pycryptodome", "pycryptodomex", "pynacl", "pyopenssl", "paramiko"], manifestNames: ["requirements.txt", "pipfile", "pyproject.toml", "setup.cfg"], algorithm: "Python crypto package parameters not observed", cryptoRole: "Cryptographic library", library: "Python crypto package", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares a Python cryptographic package", confidence: 70, dataLifetimeYears: 7, migrationMonths: 9 },
  { id: "manifest-js-crypto", packages: ["jose", "jsonwebtoken", "crypto-js", "node-forge", "jwk-to-pem", "tweetnacl"], manifestNames: ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"], algorithm: "JavaScript crypto package parameters not observed", cryptoRole: "Cryptographic library", library: "JavaScript crypto package", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares a JavaScript cryptographic package", confidence: 70, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "manifest-rust-crypto", packages: ["ring", "rustls", "aes-gcm", "rsa", "ed25519-dalek"], manifestNames: ["cargo.toml"], algorithm: "Rust crypto package parameters not observed", cryptoRole: "Cryptographic library", library: "Rust crypto package", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Dependency manifest declares a Rust cryptographic package", confidence: 70, dataLifetimeYears: 7, migrationMonths: 9 },
];

const CONFIG_RULES: StaticRule[] = [
  { id: "config-jwt", extensions: [".env", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".properties", ".dockerfile"], expression: /^\s*(?:JWT_SECRET|JWT_ALGORITHM|jwt_algorithm)\b/im, algorithm: "JWT configuration parameter not observed", cryptoRole: "Token signature", library: "Configuration", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "JWT configuration key detected; its value was not collected", confidence: 65, dataLifetimeYears: 3, migrationMonths: 6 },
  { id: "config-encryption", extensions: [".env", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".properties", ".dockerfile"], expression: /^\s*(?:ENCRYPTION_KEY|AES_KEY|TLS_MIN_VERSION|ssl_protocols|ssl_certificate|SSLCertificateFile)\b/im, algorithm: "TLS or encryption configuration parameter not observed", cryptoRole: "Transport or encryption configuration", library: "Configuration", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "Not inferred", usageContext: "Cryptographic configuration key detected; its value was not collected", confidence: 64, dataLifetimeYears: 10, migrationMonths: 12 },
  { id: "config-weak-cipher", extensions: [".env", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".properties", ".dockerfile"], expression: /^\s*(?:ssl_ciphers|SSLCipherSuite|CIPHERS)\b.*(?:RC4|DES|3DES|MD5|NULL)/im, algorithm: "Potentially weak cipher configuration", cryptoRole: "Transport security", library: "Configuration", quantumVulnerable: false, quantumRisk: "Not inferred", classicalRisk: "High", usageContext: "Weak cipher indicator detected; configuration value was not retained", confidence: 76, dataLifetimeYears: 5, migrationMonths: 6 },
];

const CONTEXT_RULES: Array<{ id: RepositoryContextSignal["id"]; label: string; expression: RegExp }> = [
  { id: "authentication", label: "Authentication or session handling referenced", expression: /\b(?:login|sign[ -]?in|oauth|webauthn|passport|session|auth[_-]?token)\b/i },
  { id: "data-store", label: "Database or data-store configuration referenced", expression: /\b(?:database_url|postgres(?:ql)?|mysql|mongodb|redis|prisma|sequelize)\b/i },
  { id: "file-storage", label: "Document upload or storage capability referenced", expression: /\b(?:file[_-]?upload|upload(?:s)?\b|storage[_-]?bucket|s3[_-]?bucket|multer)\b/i },
  { id: "external-service", label: "External API or authenticated service integration referenced", expression: /\b(?:fetch\s*\(|axios\.|https?:\/\/|api[_-]?key|webhook)\b/i },
  { id: "environment-reference", label: "Environment-variable configuration referenced", expression: /\b(?:process\.env|os\.environ|getenv\s*\(|import\.meta\.env)\b/i },
];

export class RepositoryScanError extends Error {
  constructor(message: string, readonly code: "input" | "rate-limit" | "access" | "response" = "response") {
    super(message);
    this.name = "RepositoryScanError";
  }
}

export function parsePublicGitHubRepository(input: string): PublicGitHubRepository {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new RepositoryScanError("Enter a valid public GitHub repository URL.", "input");
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password || url.port) {
    throw new RepositoryScanError("Only standard HTTPS public GitHub repository URLs are supported by this MVP.", "input");
  }
  const [owner, rawRepository, ...rest] = url.pathname.split("/").filter(Boolean);
  const repository = rawRepository?.replace(/\.git$/i, "");
  if (!owner || !repository || rest.length || !/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new RepositoryScanError("Use a repository root URL in the form https://github.com/owner/repository.", "input");
  }
  return { owner, repository, canonicalUrl: `https://github.com/${owner}/${repository}` };
}

function extensionFor(path: string) {
  const filename = path.split("/").at(-1)?.toLowerCase() ?? "";
  if (filename === "dockerfile") return ".dockerfile";
  if (filename.startsWith(".env")) return ".env";
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

function isAllowedAnalysisPath(path: string, size: number) {
  const segments = path.split("/");
  if (segments.some(segment => EXCLUDED_PATH_SEGMENTS.has(segment)) || path.endsWith(".min.js") || size > MAX_FILE_BYTES) return false;
  return SOURCE_EXTENSIONS.has(extensionFor(path)) || ANALYSIS_FILENAMES.has(path.split("/").at(-1)?.toLowerCase() ?? "");
}

function lineNumber(content: string, offset: number) {
  return content.slice(0, offset).split(/\r?\n/).length;
}

function safeKeyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);
}

function repositoryFindingKey(path: string, ruleId: string) {
  const hint = safeKeyPart(ruleId).slice(0, 20);
  const fingerprint = createHash("sha256").update(`${path}\u0000${ruleId}`).digest("hex").slice(0, 16);
  return `repo-${hint}-${fingerprint}`;
}

function createFinding(repository: PublicGitHubRepository, branch: string, file: RepositorySourceFile, rule: StaticRule, match: RegExpExecArray, assetType: "Source file" | "Dependency manifest" | "Configuration file"): SeedFinding {
  const assessment = evaluateFindingRisk({ quantumVulnerable: rule.quantumVulnerable, sensitivity: "Not classified", fallbackDataLifetimeYears: rule.dataLifetimeYears ?? 5, fallbackMigrationMonths: rule.migrationMonths ?? 6, crqcHorizonYears: 9 });
  const location = `${repository.owner}/${repository.repository}@${branch}:${file.path}:${lineNumber(file.content, match.index ?? 0)}`;
  return {
    findingKey: repositoryFindingKey(file.path, rule.id),
    assetName: file.path,
    assetType,
    algorithm: rule.deriveAlgorithm?.(file.content) ?? rule.algorithm,
    cryptoRole: rule.cryptoRole,
    library: rule.library,
    version: null,
    sourceLocation: location,
    usageContext: rule.usageContext,
    dataState: "Not inferred from static analysis",
    environment: "Public source repository",
    sensitivity: "Not classified",
    criticality: "Not classified",
    riskLevel: assessment.level,
    classicalRisk: rule.classicalRisk,
    quantumRisk: rule.quantumRisk,
    quantumVulnerable: rule.quantumVulnerable,
    hndlExposure: assessment.hndlExposure,
    dataLifetimeYears: assessment.dataLifetimeYears,
    migrationMonths: assessment.migrationMonths,
    confidence: rule.confidence ?? 76,
    evidence: `Static ${assetType.toLowerCase()} pattern ${rule.id} matched at ${location}. Repository content was read as text and was not executed.`,
    provenance: `Bounded public GitHub static analysis of ${repository.canonicalUrl} at branch ${branch}.`,
  };
}

function dependencyExpression(packages: string[]) {
  return new RegExp(`(?:^|[\\s"'/:<>=])(${packages.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?:[\\s"'@<>=:;,]|$)`, "im");
}

export function analyzeRepositoryFiles(repository: PublicGitHubRepository, branch: string, files: RepositorySourceFile[]): SeedFinding[] {
  const findings: SeedFinding[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const extension = extensionFor(file.path);
    const filename = file.path.split("/").at(-1)?.toLowerCase() ?? "";
    const applicableRules = [...STATIC_RULES, ...CONFIG_RULES];
    for (const rule of applicableRules) {
      if (!rule.extensions.includes(extension)) continue;
      const match = rule.expression.exec(file.content);
      if (!match || match.index === undefined) continue;
      const identity = `${file.path}:${rule.id}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      findings.push(createFinding(repository, branch, file, rule, match, CONFIG_RULES.includes(rule) ? "Configuration file" : "Source file"));
    }
    for (const rule of DEPENDENCY_RULES) {
      if (!rule.manifestNames.includes(filename)) continue;
      const expression = dependencyExpression(rule.packages);
      const match = expression.exec(file.content);
      if (!match || match.index === undefined || seen.has(`${file.path}:${rule.id}`)) continue;
      seen.add(`${file.path}:${rule.id}`);
      findings.push(createFinding(repository, branch, file, { ...rule, extensions: [], expression }, match, "Dependency manifest"));
    }
  }
  return deduplicateRepositoryFindings(findings);
}

export function analyzeRepositoryContext(files: RepositorySourceFile[]): RepositoryContextSignal[] {
  const observed = new Set<RepositoryContextSignal["id"]>();
  for (const file of files) {
    for (const rule of CONTEXT_RULES) {
      if (observed.has(rule.id) || !rule.expression.test(file.content)) continue;
      observed.add(rule.id);
    }
  }
  return CONTEXT_RULES.filter(rule => observed.has(rule.id)).map(({ id, label }) => ({ id, label }));
}

type FetchHeaders = { get: (name: string) => string | null } | Record<string, string | undefined>;
type FetchResponse = { ok: boolean; status: number; headers?: FetchHeaders; json: () => Promise<unknown>; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> };
type Fetcher = (url: string, init?: RequestInit) => Promise<FetchResponse>;

function getHeader(response: FetchResponse, name: string) {
  const headers = response.headers;
  if (!headers) return undefined;
  if (typeof (headers as { get?: unknown }).get === "function") return (headers as { get: (key: string) => string | null }).get(name) ?? undefined;
  const record = headers as Record<string, string | undefined>;
  return record[name.toLowerCase()] ?? record[name];
}

function rateLimitMessage(response: FetchResponse) {
  const retryAfter = getHeader(response, "retry-after");
  const reset = getHeader(response, "x-ratelimit-reset");
  if (retryAfter) return `GitHub is temporarily limiting repository analysis. Wait about ${retryAfter} seconds, then retry.`;
  if (reset && Number.isFinite(Number(reset))) return `GitHub is temporarily limiting repository analysis. Retry after ${new Date(Number(reset) * 1000).toLocaleTimeString()}.`;
  return "GitHub is temporarily limiting repository analysis from this service. Wait a few minutes, then retry.";
}

async function fetchJson<T>(url: string, fetcher: Fetcher): Promise<T> {
  const response = await fetcher(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "ECDAT-static-scanner" } });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) throw new RepositoryScanError(rateLimitMessage(response), "rate-limit");
    throw new RepositoryScanError(`GitHub repository metadata could not be read (HTTP ${response.status}).`, "access");
  }
  return response.json() as Promise<T>;
}

async function fetchSourceText(url: string, fetcher: Fetcher) {
  const response = await fetcher(url, { headers: { Accept: "text/plain", "User-Agent": "ECDAT-static-scanner" } });
  if (!response.ok) return undefined;
  const content = await response.text();
  return content.length <= MAX_FILE_BYTES ? content : undefined;
}

function joinChunks(chunks: Uint8Array[], size: number) {
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  return joined;
}

function extractArchiveSourceFiles(archive: Uint8Array) {
  const files: RepositorySourceFile[] = [];
  let uncompressedBytes = 0;
  let extractionError: Error | undefined;
  const unzip = new Unzip(file => {
    const path = file.name.replace(/^[^/]+\//, "");
    const expectedBytes = file.originalSize ?? 0;
    if (files.length >= MAX_FILES || !isAllowedAnalysisPath(path, expectedBytes) || expectedBytes > MAX_FILE_BYTES || uncompressedBytes + expectedBytes > MAX_TOTAL_BYTES) return;
    const chunks: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, data, final) => {
      if (error) { extractionError = error; return; }
      size += data.length;
      if (size > MAX_FILE_BYTES || uncompressedBytes + size > MAX_TOTAL_BYTES) { extractionError = new RepositoryScanError("Repository archive exceeded static-analysis limits."); return; }
      chunks.push(data);
      if (final) {
        uncompressedBytes += size;
        files.push({ path, content: new TextDecoder().decode(joinChunks(chunks, size)) });
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  unzip.push(archive, true);
  if (extractionError) throw extractionError;
  return files;
}

async function readDefaultBranchFromRepositoryPage(repository: PublicGitHubRepository, fetcher: Fetcher) {
  const response = await fetcher(repository.canonicalUrl, { headers: { Accept: "text/html", "User-Agent": "ECDAT-static-scanner" } });
  if (!response.ok) return undefined;
  const page = await response.text();
  const branch = page.match(/"defaultBranch"\s*:\s*"([A-Za-z0-9._/-]+)"/)?.[1] ?? page.match(/data-default-branch="([A-Za-z0-9._/-]+)"/)?.[1];
  return branch && /^[A-Za-z0-9._/-]+$/.test(branch) ? branch : undefined;
}

async function scanArchiveFallback(repository: PublicGitHubRepository, fetcher: Fetcher): Promise<RepositoryScanResult | undefined> {
  const defaultBranch = await readDefaultBranchFromRepositoryPage(repository, fetcher);
  const candidates = Array.from(new Set([defaultBranch, "main", "master"].filter((branch): branch is string => Boolean(branch))));
  for (const branch of candidates) {
    const archiveResponse = await fetcher(`https://codeload.github.com/${repository.owner}/${repository.repository}/zip/refs/heads/${encodeURIComponent(branch)}`, { headers: { Accept: "application/zip", "User-Agent": "ECDAT-static-scanner" } });
    if (!archiveResponse.ok) continue;
    const archive = new Uint8Array(await archiveResponse.arrayBuffer());
    if (archive.length > MAX_ARCHIVE_BYTES) throw new RepositoryScanError("Repository archive exceeded the 3 MB static-analysis download limit.");
    const files = extractArchiveSourceFiles(archive);
    return {
      repository,
      branch,
      findings: analyzeRepositoryFiles(repository, branch, files),
      scannedFileCount: files.length,
      skippedFileCount: 0,
      contextSignals: analyzeRepositoryContext(files),
      coverageIncomplete: files.length >= MAX_FILES,
    };
  }
  return undefined;
}

export async function scanPublicGitHubRepository(repositoryUrl: string, fetcher: Fetcher = fetch): Promise<RepositoryScanResult> {
  const repository = parsePublicGitHubRepository(repositoryUrl);
  let metadata: { default_branch?: string };
  try {
    metadata = await fetchJson<{ default_branch?: string }>(`https://api.github.com/repos/${repository.owner}/${repository.repository}`, fetcher);
  } catch (error) {
    if (error instanceof RepositoryScanError && error.code === "rate-limit") {
      const fallback = await scanArchiveFallback(repository, fetcher);
      if (fallback) return fallback;
    }
    throw error;
  }
  const branch = metadata.default_branch;
  if (!branch || !/^[A-Za-z0-9._/-]+$/.test(branch)) throw new RepositoryScanError("The public repository did not provide a valid default branch.");
  const tree = await fetchJson<{ tree?: Array<{ path?: string; type?: string; size?: number }> }>(`https://api.github.com/repos/${repository.owner}/${repository.repository}/git/trees/${encodeURIComponent(branch)}?recursive=1`, fetcher);
  const candidates = (tree.tree ?? []).filter(item => item.type === "blob" && typeof item.path === "string" && isAllowedAnalysisPath(item.path, item.size ?? 0)).sort((left, right) => Number(ANALYSIS_FILENAMES.has((right.path ?? "").split("/").at(-1)?.toLowerCase() ?? "")) - Number(ANALYSIS_FILENAMES.has((left.path ?? "").split("/").at(-1)?.toLowerCase() ?? ""))).slice(0, MAX_FILES);
  const files: RepositorySourceFile[] = [];
  let byteBudget = MAX_TOTAL_BYTES;
  for (const candidate of candidates) {
    const path = candidate.path!;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const content = await fetchSourceText(`https://raw.githubusercontent.com/${repository.owner}/${repository.repository}/${encodeURIComponent(branch)}/${encodedPath}`, fetcher);
    if (!content || content.length > byteBudget) continue;
    byteBudget -= content.length;
    files.push({ path, content });
  }
  const findings = analyzeRepositoryFiles(repository, branch, files);
  const skippedFileCount = Math.max(0, (tree.tree?.length ?? 0) - files.length);
  return {
    repository,
    branch,
    findings,
    scannedFileCount: files.length,
    skippedFileCount,
    contextSignals: analyzeRepositoryContext(files),
    coverageIncomplete: skippedFileCount > 0,
  };
}
