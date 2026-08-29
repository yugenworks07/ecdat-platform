import { scoreMoscaRisk } from "./ecdatRisk";

export const scenarioIds = [
  "python-web",
  "java-enterprise",
  "container-mesh",
  "compliance-heavy",
] as const;

export type ScenarioId = (typeof scenarioIds)[number];

export type SeedFinding = {
  findingKey: string;
  assetName: string;
  assetType: string;
  algorithm: string;
  cryptoRole: string;
  library: string | null;
  version: string | null;
  sourceLocation: string;
  usageContext: string;
  dataState: string;
  environment: string;
  sensitivity: string;
  criticality: string;
  riskLevel: string;
  classicalRisk: string;
  quantumRisk: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  dataLifetimeYears: number;
  migrationMonths: number;
  confidence: number;
  evidence: string;
  provenance: string;
};

export type SeedRecommendation = {
  findingKey: string;
  recommendationType: string;
  title: string;
  candidate: string;
  migrationNotes: string;
  compatibility: string;
  indicativeEffort: string;
  indicativeLatency: string;
  priority: number;
};

export type SeedRelationship = {
  sourceNode: string;
  targetNode: string;
  relationship: string;
  evidence: string;
  confidence: number;
};

export type SeedWave = {
  wave: number;
  title: string;
  rationale: string;
  scope: string;
  indicativeEffort: string;
  dependencies: string;
};

export type SeedScenario = {
  id: ScenarioId;
  label: string;
  displayName: string;
  description: string;
  repositoryPlaceholder: string;
  badges: string[];
  totalAssets: number;
  criticalCount: number;
  quantumVulnerableCount: number;
  hndlCount: number;
  quantumReadiness: number;
  findings: SeedFinding[];
  recommendations: SeedRecommendation[];
  relationships: SeedRelationship[];
  waves: SeedWave[];
};

function finding(input: Omit<SeedFinding, "riskLevel" | "hndlExposure"> & { crqcHorizon?: number }): SeedFinding {
  const crqcHorizon = input.crqcHorizon ?? 9;
  const mosca = scoreMoscaRisk(input.dataLifetimeYears, input.migrationMonths, crqcHorizon);
  return {
    ...input,
    riskLevel: mosca.level,
    hndlExposure:
      input.quantumVulnerable &&
      ["Confidential", "Secret", "Top secret"].includes(input.sensitivity) &&
      input.dataLifetimeYears >= crqcHorizon,
  };
}

export function recommendationsFor(findings: SeedFinding[]): SeedRecommendation[] {
  return findings
    .filter(finding => finding.quantumVulnerable || finding.classicalRisk === "High")
    .map((finding, index) => {
      const role = finding.cryptoRole.toLowerCase();
      const highAssurance = ["Critical", "High"].includes(finding.criticality) && ["Secret", "Top secret", "Confidential"].includes(finding.sensitivity);
      const sensitiveTransport = finding.dataState === "In transit" && ["Secret", "Top secret"].includes(finding.sensitivity);
      const constrainedRuntime = finding.environment.toLowerCase().includes("edge") || finding.environment.toLowerCase().includes("mobile");
      const contextNotes = [
        `Context: ${finding.dataState.toLowerCase()} data in ${finding.environment.toLowerCase()}.`,
        `Business criticality: ${finding.criticality.toLowerCase()}; data sensitivity: ${finding.sensitivity.toLowerCase()}.`,
        `Observed use: ${finding.usageContext}.`,
      ].join(" ");
      const environmentConstraint = finding.environment.toLowerCase().includes("on-premises")
        ? " Confirm HSM, PKI, and platform-provider support before rollout."
        : finding.environment.toLowerCase().includes("container")
          ? " Validate the updated runtime through a signed base-image rollout."
          : " Validate managed-service and client interoperability in a staged rollout.";
      if (role.includes("key exchange") || role.includes("kem")) {
        const candidate = sensitiveTransport
          ? "X25519 + ML-KEM-1024"
          : constrainedRuntime
            ? "Hybrid ML-KEM-512 path, subject to constrained-platform validation"
            : "X25519 + ML-KEM-768";
        return {
          findingKey: finding.findingKey,
          recommendationType: "Hybrid key establishment",
          title: `Stage a hybrid key-establishment path for ${finding.assetName}`,
          candidate,
          migrationNotes: `${contextNotes} Validate TLS or application protocol support in a canary path before changing the default handshake.${environmentConstraint}`,
          compatibility: sensitiveTransport
            ? "Requires peer support, a tested fallback strategy, and explicit prioritisation because the observed data is high-sensitivity in transit."
            : "Requires peer support and a tested fallback strategy for legacy clients.",
          indicativeEffort: highAssurance ? "Indicative: 4–8 engineer-weeks" : "Indicative: 2–4 engineer-weeks",
          indicativeLatency: sensitiveTransport ? "Indicative: +2–6 ms per negotiated session" : "Indicative: +1–4 ms per negotiated session",
          priority: highAssurance ? index + 1 : index + 8,
        };
      }
      if (role.includes("signature")) {
        const certificateFlow = finding.assetType.toLowerCase().includes("certificate") || finding.usageContext.toLowerCase().includes("certificate");
        return {
          findingKey: finding.findingKey,
          recommendationType: "Hybrid signature",
          title: `Plan a signature migration for ${finding.assetName}`,
          candidate: certificateFlow
            ? "Hybrid X.509 profile with ECDSA + ML-DSA-65"
            : highAssurance
              ? "ECDSA + ML-DSA-87"
              : "ECDSA + ML-DSA-65",
          migrationNotes: `${contextNotes} Introduce dual-verification and update certificate, token, or document-signing consumers in dependency order.${environmentConstraint}`,
          compatibility: certificateFlow
            ? "Certificate profile, issuing chain, verifier support, signature size, and rollover sequence must be tested together."
            : "Signature size, verifier support, and long-retention validation should be tested across every consumer.",
          indicativeEffort: certificateFlow || highAssurance ? "Indicative: 5–10 engineer-weeks" : "Indicative: 3–6 engineer-weeks",
          indicativeLatency: highAssurance ? "Indicative: +4–12 ms per signing operation" : "Indicative: +2–8 ms per signing operation",
          priority: highAssurance ? index + 1 : index + 7,
        };
      }
      if (role.includes("encryption") || role.includes("storage")) {
        return {
          findingKey: finding.findingKey,
          recommendationType: "Symmetric protection and key wrapping",
          title: `Strengthen data protection for ${finding.assetName}`,
          candidate: highAssurance ? "AES-256-GCM with ML-KEM-1024 key wrapping" : "AES-256-GCM with ML-KEM-768 key wrapping",
          migrationNotes: `${contextNotes} Retain authenticated encryption and migrate envelope-key management separately from bulk-data re-encryption.${environmentConstraint}`,
          compatibility: highAssurance
            ? "Confirm high-assurance key-management support, long-retention re-encryption strategy, and key rotation before rollout."
            : "Confirm key-management service support, key rotation, and retained-data lifecycle constraints.",
          indicativeEffort: highAssurance ? "Indicative: 3–6 engineer-weeks" : "Indicative: 1–3 engineer-weeks",
          indicativeLatency: finding.dataState === "At rest" ? "Indicative: negligible for bulk-data encryption; rotation workload varies" : "Indicative: validate workload-specific impact",
          priority: highAssurance ? index + 2 : index + 9,
        };
      }
      return {
        findingKey: finding.findingKey,
        recommendationType: "Integrity modernisation",
        title: `Retire legacy integrity primitive in ${finding.assetName}`,
        candidate: highAssurance || finding.usageContext.toLowerCase().includes("evidence") ? "SHA-3-256 with format-versioning" : "SHA-256 or SHA-3-256, depending on protocol support",
        migrationNotes: `${contextNotes} Update format identifiers and verify interoperability before deprecating the legacy digest.${environmentConstraint}`,
        compatibility: highAssurance
          ? "Coordinate long-retention archive formats, downstream verifiers, and recorded evidence chains."
          : "Coordinate changes with downstream verifiers and stored signature formats.",
        indicativeEffort: highAssurance ? "Indicative: 2–4 engineer-weeks" : "Indicative: 3–8 engineering days",
        indicativeLatency: "Indicative: no material user-visible latency",
        priority: highAssurance ? index + 2 : index + 10,
      };
    });
}

export function relationshipsFor(displayName: string, scenarioId: string, findings: SeedFinding[]): SeedRelationship[] {
  const serviceNode = `service:${displayName}`;
  const endpointNode = `endpoint:${scenarioId.replace(/-/g, " ")} public boundary`;
  const relationships: SeedRelationship[] = [];

  findings.forEach(finding => {
    const isCertificate = finding.assetType.toLowerCase().includes("certificate");
    const nodeType = finding.assetType.toLowerCase().includes("authority") ? "certificate-authority" : isCertificate ? "certificate" : "asset";
    const assetNode = `${nodeType}:${finding.assetName}`;
    const algorithmNode = `algorithm:${finding.algorithm}`;
    relationships.push(
      { sourceNode: serviceNode, targetNode: assetNode, relationship: isCertificate ? "USES_CERTIFICATE" : "USES", evidence: finding.provenance, confidence: finding.confidence },
      { sourceNode: assetNode, targetNode: algorithmNode, relationship: isCertificate ? "SIGNED_WITH" : "IMPLEMENTS", evidence: finding.evidence, confidence: finding.confidence },
      { sourceNode: algorithmNode, targetNode: `data:${finding.sensitivity} data`, relationship: "PROTECTS", evidence: finding.usageContext, confidence: Math.max(70, finding.confidence - 8) }
    );
    if (finding.library) {
      const libraryNode = `library:${finding.library} ${finding.version ?? "observed"}`;
      relationships.push(
        { sourceNode: serviceNode, targetNode: libraryNode, relationship: "DEPENDS_ON", evidence: finding.provenance, confidence: Math.max(70, finding.confidence - 4) },
        { sourceNode: libraryNode, targetNode: algorithmNode, relationship: "SUPPORTS", evidence: finding.evidence, confidence: Math.max(70, finding.confidence - 6) }
      );
    }
    if (finding.dataState === "In transit") {
      relationships.push({ sourceNode: endpointNode, targetNode: assetNode, relationship: isCertificate ? "PRESENTS_CERTIFICATE" : "EXPOSES", evidence: finding.usageContext, confidence: finding.confidence });
    }
    if (nodeType === "certificate-authority") {
      relationships.push({ sourceNode: assetNode, targetNode: `certificate:${finding.assetName} issuing profile`, relationship: "ISSUES", evidence: finding.usageContext, confidence: Math.max(70, finding.confidence - 5) });
    }
  });
  return relationships;
}

const pythonFindings = [
  finding({
    findingKey: "py-tls-rsa",
    assetName: "Public payment TLS entrypoint",
    assetType: "Protocol configuration",
    algorithm: "RSA-2048",
    cryptoRole: "Key exchange",
    library: "OpenSSL",
    version: "1.1.1w",
    sourceLocation: "infra/nginx/tls.conf:18",
    usageContext: "Internet-facing payment API handshake",
    dataState: "In transit",
    environment: "Containerized production",
    sensitivity: "Confidential",
    criticality: "Critical",
    classicalRisk: "Medium",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 25,
    migrationMonths: 16,
    confidence: 94,
    evidence: "TLS configuration enables an RSA certificate and classical key establishment path.",
    provenance: "Protocol scanner · tls-rsa-key-establishment · verified configuration parse",
  }),
  finding({
    findingKey: "py-db-aes",
    assetName: "Customer ledger envelope encryption",
    assetType: "Source code",
    algorithm: "AES-128-GCM",
    cryptoRole: "Storage encryption",
    library: "cryptography",
    version: "42.0.5",
    sourceLocation: "app/security/envelope.py:84",
    usageContext: "Customer payment ledger encryption at rest",
    dataState: "At rest",
    environment: "Cloud",
    sensitivity: "Confidential",
    criticality: "Critical",
    classicalRisk: "Low",
    quantumRisk: "Medium",
    quantumVulnerable: false,
    dataLifetimeYears: 10,
    migrationMonths: 6,
    confidence: 91,
    evidence: "AST pattern matched AESGCM with a 128-bit key material constructor.",
    provenance: "Python AST scanner · cryptography-aes-gcm · source evidence",
  }),
  finding({
    findingKey: "py-auth-ecdsa",
    assetName: "Partner settlement JWT signer",
    assetType: "Source code",
    algorithm: "ECDSA P-256",
    cryptoRole: "Digital signature",
    library: "PyJWT",
    version: "2.8.0",
    sourceLocation: "app/auth/tokens.py:42",
    usageContext: "Partner settlement token signing",
    dataState: "In use",
    environment: "Cloud",
    sensitivity: "Confidential",
    criticality: "High",
    classicalRisk: "Low",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 12,
    migrationMonths: 14,
    confidence: 97,
    evidence: "AST call path reaches jwt.encode with ES256 algorithm selection.",
    provenance: "Python AST scanner · jwt-ecdsa · source evidence",
  }),
  finding({
    findingKey: "py-partner-sha1",
    assetName: "Legacy partner webhook verifier",
    assetType: "Source code",
    algorithm: "SHA-1",
    cryptoRole: "Integrity verification",
    library: "hashlib",
    version: null,
    sourceLocation: "app/integrations/legacy_partner.py:117",
    usageContext: "Inbound webhook integrity verifier",
    dataState: "In transit",
    environment: "Cloud",
    sensitivity: "Internal",
    criticality: "Medium",
    classicalRisk: "High",
    quantumRisk: "Medium",
    quantumVulnerable: false,
    dataLifetimeYears: 2,
    migrationMonths: 3,
    confidence: 98,
    evidence: "AST call to hashlib.sha1 in active webhook verification function.",
    provenance: "Python AST scanner · deprecated-hash · source evidence",
  }),
];

const javaFindings = [
  finding({
    findingKey: "java-core-rsa",
    assetName: "Core banking client transport",
    assetType: "Source code",
    algorithm: "RSA-2048",
    cryptoRole: "Key exchange",
    library: "Java JSSE",
    version: "17",
    sourceLocation: "ledger-gateway/src/main/java/TlsClient.java:73",
    usageContext: "Inter-bank transaction transport",
    dataState: "In transit",
    environment: "On-premises",
    sensitivity: "Secret",
    criticality: "Critical",
    classicalRisk: "Medium",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 18,
    migrationMonths: 24,
    confidence: 93,
    evidence: "AST matcher found RSA key manager initialisation in transaction TLS client.",
    provenance: "Java AST scanner · jsse-rsa · source evidence",
  }),
  finding({
    findingKey: "java-hsm-ecdsa",
    assetName: "Treasury document signer",
    assetType: "Hardware module integration",
    algorithm: "ECDSA P-384",
    cryptoRole: "Digital signature",
    library: "Bouncy Castle",
    version: "1.78",
    sourceLocation: "treasury/src/main/java/HsmSigner.java:128",
    usageContext: "Treasury approval document signing through HSM",
    dataState: "In use",
    environment: "On-premises",
    sensitivity: "Secret",
    criticality: "Critical",
    classicalRisk: "Low",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 20,
    migrationMonths: 30,
    confidence: 89,
    evidence: "JCA provider registration and EC signature algorithm selection were observed.",
    provenance: "Java AST scanner · jca-ecdsa · source evidence",
  }),
  finding({
    findingKey: "java-store-aes",
    assetName: "Ledger archive encryption",
    assetType: "Source code",
    algorithm: "AES-256-GCM",
    cryptoRole: "Storage encryption",
    library: "Java JCE",
    version: "17",
    sourceLocation: "archive/src/main/java/ArchiveCipher.java:51",
    usageContext: "Long-term transaction archive encryption",
    dataState: "At rest",
    environment: "On-premises",
    sensitivity: "Confidential",
    criticality: "High",
    classicalRisk: "Low",
    quantumRisk: "Low",
    quantumVulnerable: false,
    dataLifetimeYears: 12,
    migrationMonths: 8,
    confidence: 96,
    evidence: "Cipher.getInstance uses AES/GCM/NoPadding with an observed 256-bit configuration.",
    provenance: "Java AST scanner · jce-aes-gcm · source evidence",
  }),
];

const containerFindings = [
  finding({
    findingKey: "ctr-openssl",
    assetName: "Shared edge base image",
    assetType: "Container image",
    algorithm: "OpenSSL 1.1.1",
    cryptoRole: "Cryptographic library",
    library: "OpenSSL",
    version: "1.1.1w",
    sourceLocation: "registry/logistics/edge-base@sha256:0d7…",
    usageContext: "Shared base image for API, auth, and worker services",
    dataState: "In use",
    environment: "Containerized production",
    sensitivity: "Confidential",
    criticality: "Critical",
    classicalRisk: "High",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 15,
    migrationMonths: 10,
    confidence: 87,
    evidence: "Package inventory and layer manifest identify libssl 1.1.1w in a shared base image.",
    provenance: "Container scanner · OCI layer inventory · package metadata",
  }),
  finding({
    findingKey: "ctr-tls10",
    assetName: "Legacy routing gateway",
    assetType: "Protocol configuration",
    algorithm: "TLS 1.0",
    cryptoRole: "Transport protocol",
    library: "nginx",
    version: "1.22",
    sourceLocation: "gateway/nginx.conf:90",
    usageContext: "Legacy carrier integration endpoint",
    dataState: "In transit",
    environment: "Containerized production",
    sensitivity: "Internal",
    criticality: "High",
    classicalRisk: "High",
    quantumRisk: "Medium",
    quantumVulnerable: false,
    dataLifetimeYears: 4,
    migrationMonths: 4,
    confidence: 99,
    evidence: "Configuration parser found TLSv1 enabled in the server protocol list.",
    provenance: "Protocol scanner · nginx-tls-version · verified configuration parse",
  }),
  finding({
    findingKey: "ctr-rsa-cert",
    assetName: "Fleet API certificate",
    assetType: "Certificate",
    algorithm: "RSA-2048",
    cryptoRole: "Digital signature",
    library: "X.509",
    version: null,
    sourceLocation: "secrets/fleet-api.pem",
    usageContext: "Fleet API public certificate",
    dataState: "In transit",
    environment: "Containerized production",
    sensitivity: "Confidential",
    criticality: "High",
    classicalRisk: "Low",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 8,
    migrationMonths: 9,
    confidence: 100,
    evidence: "X.509 parser read RSA public key metadata and certificate chain details.",
    provenance: "Certificate scanner · x509-parse · DER metadata",
  }),
];

const complianceFindings = [
  finding({
    findingKey: "gov-rsa-cert",
    assetName: "Citizen records signing CA",
    assetType: "Certificate authority",
    algorithm: "RSA-4096",
    cryptoRole: "Digital signature",
    library: "Enterprise PKI",
    version: null,
    sourceLocation: "pki/issuing-ca-profile.yaml:31",
    usageContext: "Citizen records document signature chain",
    dataState: "In use",
    environment: "On-premises",
    sensitivity: "Top secret",
    criticality: "Critical",
    classicalRisk: "Low",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 50,
    migrationMonths: 36,
    confidence: 92,
    evidence: "PKI profile references an RSA 4096-bit issuing key for long-retention signed records.",
    provenance: "Configuration scanner · pki-rsa-profile · source evidence",
  }),
  finding({
    findingKey: "gov-dh-vpn",
    assetName: "Inter-agency VPN profile",
    assetType: "Protocol configuration",
    algorithm: "Diffie-Hellman 2048",
    cryptoRole: "Key exchange",
    library: "strongSwan",
    version: "5.9",
    sourceLocation: "vpn/interagency.conf:64",
    usageContext: "Inter-agency sensitive-data transport",
    dataState: "In transit",
    environment: "On-premises",
    sensitivity: "Secret",
    criticality: "Critical",
    classicalRisk: "Medium",
    quantumRisk: "High",
    quantumVulnerable: true,
    dataLifetimeYears: 30,
    migrationMonths: 18,
    confidence: 96,
    evidence: "VPN profile explicitly selects a MODP 2048 Diffie-Hellman proposal.",
    provenance: "Protocol scanner · ipsec-dh-group · verified configuration parse",
  }),
  finding({
    findingKey: "gov-md5-archive",
    assetName: "Legacy evidence archive checksum",
    assetType: "Source code",
    algorithm: "MD5",
    cryptoRole: "Integrity verification",
    library: "Apache Commons Codec",
    version: "1.16",
    sourceLocation: "archive/ChecksumVerifier.java:39",
    usageContext: "Evidence archive checksum verification",
    dataState: "At rest",
    environment: "On-premises",
    sensitivity: "Secret",
    criticality: "High",
    classicalRisk: "High",
    quantumRisk: "Medium",
    quantumVulnerable: false,
    dataLifetimeYears: 20,
    migrationMonths: 5,
    confidence: 98,
    evidence: "AST matcher found DigestUtils.md5Hex in the evidence verification path.",
    provenance: "Java AST scanner · deprecated-md5 · source evidence",
  }),
];

function scenario(
  id: ScenarioId,
  label: string,
  displayName: string,
  description: string,
  repositoryPlaceholder: string,
  badges: string[],
  findings: SeedFinding[],
  metrics: Pick<SeedScenario, "totalAssets" | "criticalCount" | "quantumVulnerableCount" | "hndlCount" | "quantumReadiness">
): SeedScenario {
  const relationships = relationshipsFor(displayName, id, findings);
  return {
    id,
    label,
    displayName,
    description,
    repositoryPlaceholder,
    badges,
    ...metrics,
    findings,
    recommendations: recommendationsFor(findings),
    relationships,
    waves: [
      {
        wave: 1,
        title: "Remove immediate classical weaknesses",
        rationale: "Retire deprecated protocols and integrity primitives before expanding the PQC rollout.",
        scope: "Legacy protocol configuration and deprecated hash usages",
        indicativeEffort: "Indicative: 1–2 engineer-weeks",
        dependencies: "Partner compatibility test plan",
      },
      {
        wave: 2,
        title: "Upgrade shared cryptographic dependencies",
        rationale: "A shared dependency update reduces repeated remediation across connected services.",
        scope: "Base images, shared libraries, and certificate tooling",
        indicativeEffort: "Indicative: 2–5 engineer-weeks",
        dependencies: "Regression suite and deployment canary",
      },
      {
        wave: 3,
        title: "Introduce hybrid quantum-safe paths",
        rationale: "Prioritise long-lived confidential data and externally exposed cryptographic boundaries.",
        scope: "Key establishment, signature flows, and key-management integration",
        indicativeEffort: "Indicative: 4–10 engineer-weeks",
        dependencies: "Protocol peer support and platform-library validation",
      },
    ],
  };
}

export const scenarioCatalog: SeedScenario[] = [
  scenario(
    "python-web",
    "Python web application",
    "Mercury Payments API",
    "A Python payment service with a public TLS edge, encrypted ledger data, and partner-token signing.",
    "https://github.com/acme/mercury-payments",
    ["Python", "TLS edge", "Payment data"],
    pythonFindings,
    { totalAssets: 47, criticalCount: 5, quantumVulnerableCount: 23, hndlCount: 3, quantumReadiness: 34 }
  ),
  scenario(
    "java-enterprise",
    "Java enterprise service",
    "Atlas Treasury Platform",
    "A Java enterprise estate with on-premises signing workflows, HSM integration, and long-retention ledgers.",
    "https://github.com/acme/atlas-treasury",
    ["Java 17", "HSM", "On-premises"],
    javaFindings,
    { totalAssets: 83, criticalCount: 8, quantumVulnerableCount: 31, hndlCount: 5, quantumReadiness: 29 }
  ),
  scenario(
    "container-mesh",
    "Container microservices",
    "Orion Logistics Mesh",
    "A containerised service mesh where a shared base image creates a broad remediation opportunity.",
    "registry.example.com/orion/edge-base:latest",
    ["OCI image", "Shared dependency", "Service mesh"],
    containerFindings,
    { totalAssets: 116, criticalCount: 7, quantumVulnerableCount: 44, hndlCount: 2, quantumReadiness: 41 }
  ),
  scenario(
    "compliance-heavy",
    "Compliance-heavy system",
    "Sovereign Records Portal",
    "A sensitive records environment with long-retention data, certificate authorities, and inter-agency transport.",
    "https://github.com/acme/sovereign-records",
    ["Long retention", "PKI", "High assurance"],
    complianceFindings,
    { totalAssets: 154, criticalCount: 14, quantumVulnerableCount: 76, hndlCount: 11, quantumReadiness: 18 }
  ),
];

export function getSeededScenario(id: ScenarioId) {
  const selected = scenarioCatalog.find(scenario => scenario.id === id) ?? scenarioCatalog[0];
  return JSON.parse(JSON.stringify(selected)) as SeedScenario;
}
