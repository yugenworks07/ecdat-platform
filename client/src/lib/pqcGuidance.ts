export type PqcGuidanceFinding = Pick<
  { algorithm: string; cryptoRole: string; quantumVulnerable: boolean; hndlExposure: boolean; dataLifetimeYears: number; migrationMonths: number },
  "algorithm" | "cryptoRole" | "quantumVulnerable" | "hndlExposure" | "dataLifetimeYears" | "migrationMonths"
>;

export type PqcReference = { id: string; title: string; href: string; summary: string };

export type PqcGuidance = {
  posture: "signature" | "key-establishment" | "symmetric" | "hash-and-kdf";
  title: string;
  summary: string;
  standards: PqcReference[];
  steps: string[];
  validationGates: string[];
  urgencySignals: string[];
};

const references = {
  mlKem: { id: "FIPS 203", title: "ML-KEM key establishment", href: "https://csrc.nist.gov/pubs/fips/203/final", summary: "Use for protected key establishment after protocol and provider compatibility validation." },
  mlDsa: { id: "FIPS 204", title: "ML-DSA signatures", href: "https://csrc.nist.gov/pubs/fips/204/final", summary: "Use for post-quantum digital-signature planning where signing and verification interoperability is established." },
  slhDsa: { id: "FIPS 205", title: "SLH-DSA signatures", href: "https://csrc.nist.gov/pubs/fips/205/final", summary: "Consider as the standardised stateless hash-based signature option for relevant assurance and interoperability requirements." },
} satisfies Record<string, PqcReference>;

function urgencySignals(finding: PqcGuidanceFinding) {
  const signals: string[] = [];
  if (finding.quantumVulnerable) signals.push("Public-key algorithm marked quantum-vulnerable in this assessment");
  if (finding.hndlExposure) signals.push("Potential harvest-now, decrypt-later exposure is present");
  if (finding.dataLifetimeYears + finding.migrationMonths / 12 >= 9) signals.push("Data lifetime and migration window exceed the current nine-year planning horizon");
  return signals.length ? signals : ["No quantum-vulnerability or HNDL signal is currently attached to this finding"];
}

export function pqcGuidanceForFinding(finding: PqcGuidanceFinding): PqcGuidance {
  const algorithm = finding.algorithm.toLowerCase();
  const role = finding.cryptoRole.toLowerCase();
  const signals = urgencySignals(finding);

  if (role.includes("signature") || (!role.includes("key") && /rsa|ecdsa|ed25519|dsa/.test(algorithm))) {
    return {
      posture: "signature",
      title: "Signature transition guidance",
      summary: "Plan a staged signature transition with interoperable verification, certificate or document-format review, and an explicit rollback path. Do not treat this guidance as a production cutover decision.",
      standards: [references.mlDsa, references.slhDsa],
      steps: ["Confirm every signing and verification boundary using the observed asset.", "Prototype the generated target path with the relying-party ecosystem before changing production trust anchors.", "Version signed formats and retain a verified rollback or coexistence path during the transition."],
      validationGates: ["Provider and hardware-security-module support", "Certificate, document, or protocol interoperability", "Verification performance and key-lifecycle testing"],
      urgencySignals: signals,
    };
  }

  if (role.includes("key") || /rsa|dh|ecdh|tls|ssh|x25519/.test(algorithm)) {
    return {
      posture: "key-establishment",
      title: "Key-establishment transition guidance",
      summary: "Evaluate an ML-KEM-enabled key-establishment path with negotiated interoperability, crypto-agility, and observed protocol-boundary testing before deployment.",
      standards: [references.mlKem],
      steps: ["Inventory the observed protocol endpoints, clients, libraries, and certificate dependencies.", "Validate a hybrid or staged key-establishment design against the supported protocol and provider versions.", "Measure handshake, message-size, and operational impacts in a representative non-production environment."],
      validationGates: ["Peer, client, and gateway interoperability", "Cryptographic-provider and platform support", "Handshake size, latency, and failure-mode testing"],
      urgencySignals: signals,
    };
  }

  if (role.includes("encryption") || /aes|chacha|fernet/.test(algorithm)) {
    return {
      posture: "symmetric",
      title: "Symmetric protection and key-wrapping guidance",
      summary: "The observed symmetric primitive is not automatically replaced by a PQC primitive. Focus the transition plan on the public-key key-establishment or key-wrapping boundary, plus crypto-agile key rotation.",
      standards: [references.mlKem],
      steps: ["Identify the observed key-wrapping, transport, or envelope-encryption boundary protecting this asset’s keys.", "Validate the generated wrapping or establishment target with the existing key-management service and providers.", "Plan key rotation, versioning, and rollback before changing protected data paths."],
      validationGates: ["Key-management and envelope-encryption compatibility", "Ciphertext and metadata format versioning", "Key rotation and recovery exercises"],
      urgencySignals: signals,
    };
  }

  return {
    posture: "hash-and-kdf",
    title: "Hashing and crypto-agility guidance",
    summary: "No direct PQC replacement is inferred from this observed hashing or KDF evidence. Preserve appropriate security parameters while making algorithm selection, versioning, and rotation explicit.",
    standards: [],
    steps: ["Confirm the observed use, security parameter, and protocol dependency.", "Remove deprecated choices where the scan evidence indicates one and preserve versioned data verification.", "Record an algorithm-agility and rotation path before adjacent public-key components change."],
    validationGates: ["Backward-compatible verification", "Parameter and implementation review", "Versioned data and rollback testing"],
    urgencySignals: signals,
  };
}
