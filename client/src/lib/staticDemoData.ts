// Generated from server/ecdatSeed.ts. Keep the static demo aligned with the canonical seeded scenarios.
export const staticScenarioCatalog = [
  {
    "id": "python-web",
    "label": "Python web application",
    "displayName": "Mercury Payments API",
    "description": "A Python payment service with a public TLS edge, encrypted ledger data, and partner-token signing.",
    "repositoryPlaceholder": "https://github.com/acme/mercury-payments",
    "badges": [
      "Python",
      "TLS edge",
      "Payment data"
    ],
    "totalAssets": 47,
    "criticalCount": 5,
    "quantumVulnerableCount": 23,
    "hndlCount": 3,
    "quantumReadiness": 34,
    "findings": [
      {
        "findingKey": "py-tls-rsa",
        "assetName": "Public payment TLS entrypoint",
        "assetType": "Protocol configuration",
        "algorithm": "RSA-2048",
        "cryptoRole": "Key exchange",
        "library": "OpenSSL",
        "version": "1.1.1w",
        "sourceLocation": "infra/nginx/tls.conf:18",
        "usageContext": "Internet-facing payment API handshake",
        "dataState": "In transit",
        "environment": "Containerized production",
        "sensitivity": "Confidential",
        "criticality": "Critical",
        "classicalRisk": "Medium",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 25,
        "migrationMonths": 16,
        "confidence": 94,
        "evidence": "TLS configuration enables an RSA certificate and classical key establishment path.",
        "provenance": "Protocol scanner · tls-rsa-key-establishment · verified configuration parse",
        "riskLevel": "Critical",
        "hndlExposure": true
      },
      {
        "findingKey": "py-db-aes",
        "assetName": "Customer ledger envelope encryption",
        "assetType": "Source code",
        "algorithm": "AES-128-GCM",
        "cryptoRole": "Storage encryption",
        "library": "cryptography",
        "version": "42.0.5",
        "sourceLocation": "app/security/envelope.py:84",
        "usageContext": "Customer payment ledger encryption at rest",
        "dataState": "At rest",
        "environment": "Cloud",
        "sensitivity": "Confidential",
        "criticality": "Critical",
        "classicalRisk": "Low",
        "quantumRisk": "Medium",
        "quantumVulnerable": false,
        "dataLifetimeYears": 10,
        "migrationMonths": 6,
        "confidence": 91,
        "evidence": "AST pattern matched AESGCM with a 128-bit key material constructor.",
        "provenance": "Python AST scanner · cryptography-aes-gcm · source evidence",
        "riskLevel": "Medium",
        "hndlExposure": false
      },
      {
        "findingKey": "py-auth-ecdsa",
        "assetName": "Partner settlement JWT signer",
        "assetType": "Source code",
        "algorithm": "ECDSA P-256",
        "cryptoRole": "Digital signature",
        "library": "PyJWT",
        "version": "2.8.0",
        "sourceLocation": "app/auth/tokens.py:42",
        "usageContext": "Partner settlement token signing",
        "dataState": "In use",
        "environment": "Cloud",
        "sensitivity": "Confidential",
        "criticality": "High",
        "classicalRisk": "Low",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 12,
        "migrationMonths": 14,
        "confidence": 97,
        "evidence": "AST call path reaches jwt.encode with ES256 algorithm selection.",
        "provenance": "Python AST scanner · jwt-ecdsa · source evidence",
        "riskLevel": "High",
        "hndlExposure": true
      },
      {
        "findingKey": "py-partner-sha1",
        "assetName": "Legacy partner webhook verifier",
        "assetType": "Source code",
        "algorithm": "SHA-1",
        "cryptoRole": "Integrity verification",
        "library": "hashlib",
        "version": null,
        "sourceLocation": "app/integrations/legacy_partner.py:117",
        "usageContext": "Inbound webhook integrity verifier",
        "dataState": "In transit",
        "environment": "Cloud",
        "sensitivity": "Internal",
        "criticality": "Medium",
        "classicalRisk": "High",
        "quantumRisk": "Medium",
        "quantumVulnerable": false,
        "dataLifetimeYears": 2,
        "migrationMonths": 3,
        "confidence": 98,
        "evidence": "AST call to hashlib.sha1 in active webhook verification function.",
        "provenance": "Python AST scanner · deprecated-hash · source evidence",
        "riskLevel": "Low",
        "hndlExposure": false
      }
    ],
    "recommendations": [
      {
        "findingKey": "py-tls-rsa",
        "recommendationType": "Hybrid key establishment",
        "title": "Stage a hybrid key-establishment path for Public payment TLS entrypoint",
        "candidate": "X25519 + ML-KEM-768",
        "migrationNotes": "Context: in transit data in containerized production. Business criticality: critical; data sensitivity: confidential. Observed use: Internet-facing payment API handshake. Validate TLS or application protocol support in a canary path before changing the default handshake. Validate the updated runtime through a signed base-image rollout.",
        "compatibility": "Requires peer support and a tested fallback strategy for legacy clients.",
        "indicativeEffort": "Indicative: 4–8 engineer-weeks",
        "indicativeLatency": "Indicative: +1–4 ms per negotiated session",
        "priority": 1
      },
      {
        "findingKey": "py-auth-ecdsa",
        "recommendationType": "Hybrid signature",
        "title": "Plan a signature migration for Partner settlement JWT signer",
        "candidate": "ECDSA + ML-DSA-87",
        "migrationNotes": "Context: in use data in cloud. Business criticality: high; data sensitivity: confidential. Observed use: Partner settlement token signing. Introduce dual-verification and update certificate, token, or document-signing consumers in dependency order. Validate managed-service and client interoperability in a staged rollout.",
        "compatibility": "Signature size, verifier support, and long-retention validation should be tested across every consumer.",
        "indicativeEffort": "Indicative: 5–10 engineer-weeks",
        "indicativeLatency": "Indicative: +4–12 ms per signing operation",
        "priority": 2
      },
      {
        "findingKey": "py-partner-sha1",
        "recommendationType": "Integrity modernisation",
        "title": "Retire legacy integrity primitive in Legacy partner webhook verifier",
        "candidate": "SHA-256 or SHA-3-256, depending on protocol support",
        "migrationNotes": "Context: in transit data in cloud. Business criticality: medium; data sensitivity: internal. Observed use: Inbound webhook integrity verifier. Update format identifiers and verify interoperability before deprecating the legacy digest. Validate managed-service and client interoperability in a staged rollout.",
        "compatibility": "Coordinate changes with downstream verifiers and stored signature formats.",
        "indicativeEffort": "Indicative: 3–8 engineering days",
        "indicativeLatency": "Indicative: no material user-visible latency",
        "priority": 12
      }
    ],
    "relationships": [
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "asset:Public payment TLS entrypoint",
        "relationship": "USES",
        "evidence": "Protocol scanner · tls-rsa-key-establishment · verified configuration parse",
        "confidence": 94
      },
      {
        "sourceNode": "asset:Public payment TLS entrypoint",
        "targetNode": "algorithm:RSA-2048",
        "relationship": "IMPLEMENTS",
        "evidence": "TLS configuration enables an RSA certificate and classical key establishment path.",
        "confidence": 94
      },
      {
        "sourceNode": "algorithm:RSA-2048",
        "targetNode": "data:Confidential data",
        "relationship": "PROTECTS",
        "evidence": "Internet-facing payment API handshake",
        "confidence": 86
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "library:OpenSSL 1.1.1w",
        "relationship": "DEPENDS_ON",
        "evidence": "Protocol scanner · tls-rsa-key-establishment · verified configuration parse",
        "confidence": 90
      },
      {
        "sourceNode": "library:OpenSSL 1.1.1w",
        "targetNode": "algorithm:RSA-2048",
        "relationship": "SUPPORTS",
        "evidence": "TLS configuration enables an RSA certificate and classical key establishment path.",
        "confidence": 88
      },
      {
        "sourceNode": "endpoint:python web public boundary",
        "targetNode": "asset:Public payment TLS entrypoint",
        "relationship": "EXPOSES",
        "evidence": "Internet-facing payment API handshake",
        "confidence": 94
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "asset:Customer ledger envelope encryption",
        "relationship": "USES",
        "evidence": "Python AST scanner · cryptography-aes-gcm · source evidence",
        "confidence": 91
      },
      {
        "sourceNode": "asset:Customer ledger envelope encryption",
        "targetNode": "algorithm:AES-128-GCM",
        "relationship": "IMPLEMENTS",
        "evidence": "AST pattern matched AESGCM with a 128-bit key material constructor.",
        "confidence": 91
      },
      {
        "sourceNode": "algorithm:AES-128-GCM",
        "targetNode": "data:Confidential data",
        "relationship": "PROTECTS",
        "evidence": "Customer payment ledger encryption at rest",
        "confidence": 83
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "library:cryptography 42.0.5",
        "relationship": "DEPENDS_ON",
        "evidence": "Python AST scanner · cryptography-aes-gcm · source evidence",
        "confidence": 87
      },
      {
        "sourceNode": "library:cryptography 42.0.5",
        "targetNode": "algorithm:AES-128-GCM",
        "relationship": "SUPPORTS",
        "evidence": "AST pattern matched AESGCM with a 128-bit key material constructor.",
        "confidence": 85
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "asset:Partner settlement JWT signer",
        "relationship": "USES",
        "evidence": "Python AST scanner · jwt-ecdsa · source evidence",
        "confidence": 97
      },
      {
        "sourceNode": "asset:Partner settlement JWT signer",
        "targetNode": "algorithm:ECDSA P-256",
        "relationship": "IMPLEMENTS",
        "evidence": "AST call path reaches jwt.encode with ES256 algorithm selection.",
        "confidence": 97
      },
      {
        "sourceNode": "algorithm:ECDSA P-256",
        "targetNode": "data:Confidential data",
        "relationship": "PROTECTS",
        "evidence": "Partner settlement token signing",
        "confidence": 89
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "library:PyJWT 2.8.0",
        "relationship": "DEPENDS_ON",
        "evidence": "Python AST scanner · jwt-ecdsa · source evidence",
        "confidence": 93
      },
      {
        "sourceNode": "library:PyJWT 2.8.0",
        "targetNode": "algorithm:ECDSA P-256",
        "relationship": "SUPPORTS",
        "evidence": "AST call path reaches jwt.encode with ES256 algorithm selection.",
        "confidence": 91
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "asset:Legacy partner webhook verifier",
        "relationship": "USES",
        "evidence": "Python AST scanner · deprecated-hash · source evidence",
        "confidence": 98
      },
      {
        "sourceNode": "asset:Legacy partner webhook verifier",
        "targetNode": "algorithm:SHA-1",
        "relationship": "IMPLEMENTS",
        "evidence": "AST call to hashlib.sha1 in active webhook verification function.",
        "confidence": 98
      },
      {
        "sourceNode": "algorithm:SHA-1",
        "targetNode": "data:Internal data",
        "relationship": "PROTECTS",
        "evidence": "Inbound webhook integrity verifier",
        "confidence": 90
      },
      {
        "sourceNode": "service:Mercury Payments API",
        "targetNode": "library:hashlib observed",
        "relationship": "DEPENDS_ON",
        "evidence": "Python AST scanner · deprecated-hash · source evidence",
        "confidence": 94
      },
      {
        "sourceNode": "library:hashlib observed",
        "targetNode": "algorithm:SHA-1",
        "relationship": "SUPPORTS",
        "evidence": "AST call to hashlib.sha1 in active webhook verification function.",
        "confidence": 92
      },
      {
        "sourceNode": "endpoint:python web public boundary",
        "targetNode": "asset:Legacy partner webhook verifier",
        "relationship": "EXPOSES",
        "evidence": "Inbound webhook integrity verifier",
        "confidence": 98
      }
    ],
    "waves": [
      {
        "wave": 1,
        "title": "Remove immediate classical weaknesses",
        "rationale": "Retire deprecated protocols and integrity primitives before expanding the PQC rollout.",
        "scope": "Legacy protocol configuration and deprecated hash usages",
        "indicativeEffort": "Indicative: 1–2 engineer-weeks",
        "dependencies": "Partner compatibility test plan"
      },
      {
        "wave": 2,
        "title": "Upgrade shared cryptographic dependencies",
        "rationale": "A shared dependency update reduces repeated remediation across connected services.",
        "scope": "Base images, shared libraries, and certificate tooling",
        "indicativeEffort": "Indicative: 2–5 engineer-weeks",
        "dependencies": "Regression suite and deployment canary"
      },
      {
        "wave": 3,
        "title": "Introduce hybrid quantum-safe paths",
        "rationale": "Prioritise long-lived confidential data and externally exposed cryptographic boundaries.",
        "scope": "Key establishment, signature flows, and key-management integration",
        "indicativeEffort": "Indicative: 4–10 engineer-weeks",
        "dependencies": "Protocol peer support and platform-library validation"
      }
    ]
  },
  {
    "id": "java-enterprise",
    "label": "Java enterprise service",
    "displayName": "Atlas Treasury Platform",
    "description": "A Java enterprise estate with on-premises signing workflows, HSM integration, and long-retention ledgers.",
    "repositoryPlaceholder": "https://github.com/acme/atlas-treasury",
    "badges": [
      "Java 17",
      "HSM",
      "On-premises"
    ],
    "totalAssets": 83,
    "criticalCount": 8,
    "quantumVulnerableCount": 31,
    "hndlCount": 5,
    "quantumReadiness": 29,
    "findings": [
      {
        "findingKey": "java-core-rsa",
        "assetName": "Core banking client transport",
        "assetType": "Source code",
        "algorithm": "RSA-2048",
        "cryptoRole": "Key exchange",
        "library": "Java JSSE",
        "version": "17",
        "sourceLocation": "ledger-gateway/src/main/java/TlsClient.java:73",
        "usageContext": "Inter-bank transaction transport",
        "dataState": "In transit",
        "environment": "On-premises",
        "sensitivity": "Secret",
        "criticality": "Critical",
        "classicalRisk": "Medium",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 18,
        "migrationMonths": 24,
        "confidence": 93,
        "evidence": "AST matcher found RSA key manager initialisation in transaction TLS client.",
        "provenance": "Java AST scanner · jsse-rsa · source evidence",
        "riskLevel": "Critical",
        "hndlExposure": true
      },
      {
        "findingKey": "java-hsm-ecdsa",
        "assetName": "Treasury document signer",
        "assetType": "Hardware module integration",
        "algorithm": "ECDSA P-384",
        "cryptoRole": "Digital signature",
        "library": "Bouncy Castle",
        "version": "1.78",
        "sourceLocation": "treasury/src/main/java/HsmSigner.java:128",
        "usageContext": "Treasury approval document signing through HSM",
        "dataState": "In use",
        "environment": "On-premises",
        "sensitivity": "Secret",
        "criticality": "Critical",
        "classicalRisk": "Low",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 20,
        "migrationMonths": 30,
        "confidence": 89,
        "evidence": "JCA provider registration and EC signature algorithm selection were observed.",
        "provenance": "Java AST scanner · jca-ecdsa · source evidence",
        "riskLevel": "Critical",
        "hndlExposure": true
      },
      {
        "findingKey": "java-store-aes",
        "assetName": "Ledger archive encryption",
        "assetType": "Source code",
        "algorithm": "AES-256-GCM",
        "cryptoRole": "Storage encryption",
        "library": "Java JCE",
        "version": "17",
        "sourceLocation": "archive/src/main/java/ArchiveCipher.java:51",
        "usageContext": "Long-term transaction archive encryption",
        "dataState": "At rest",
        "environment": "On-premises",
        "sensitivity": "Confidential",
        "criticality": "High",
        "classicalRisk": "Low",
        "quantumRisk": "Low",
        "quantumVulnerable": false,
        "dataLifetimeYears": 12,
        "migrationMonths": 8,
        "confidence": 96,
        "evidence": "Cipher.getInstance uses AES/GCM/NoPadding with an observed 256-bit configuration.",
        "provenance": "Java AST scanner · jce-aes-gcm · source evidence",
        "riskLevel": "High",
        "hndlExposure": false
      }
    ],
    "recommendations": [
      {
        "findingKey": "java-core-rsa",
        "recommendationType": "Hybrid key establishment",
        "title": "Stage a hybrid key-establishment path for Core banking client transport",
        "candidate": "X25519 + ML-KEM-1024",
        "migrationNotes": "Context: in transit data in on-premises. Business criticality: critical; data sensitivity: secret. Observed use: Inter-bank transaction transport. Validate TLS or application protocol support in a canary path before changing the default handshake. Confirm HSM, PKI, and platform-provider support before rollout.",
        "compatibility": "Requires peer support, a tested fallback strategy, and explicit prioritisation because the observed data is high-sensitivity in transit.",
        "indicativeEffort": "Indicative: 4–8 engineer-weeks",
        "indicativeLatency": "Indicative: +2–6 ms per negotiated session",
        "priority": 1
      },
      {
        "findingKey": "java-hsm-ecdsa",
        "recommendationType": "Hybrid signature",
        "title": "Plan a signature migration for Treasury document signer",
        "candidate": "ECDSA + ML-DSA-87",
        "migrationNotes": "Context: in use data in on-premises. Business criticality: critical; data sensitivity: secret. Observed use: Treasury approval document signing through HSM. Introduce dual-verification and update certificate, token, or document-signing consumers in dependency order. Confirm HSM, PKI, and platform-provider support before rollout.",
        "compatibility": "Signature size, verifier support, and long-retention validation should be tested across every consumer.",
        "indicativeEffort": "Indicative: 5–10 engineer-weeks",
        "indicativeLatency": "Indicative: +4–12 ms per signing operation",
        "priority": 2
      }
    ],
    "relationships": [
      {
        "sourceNode": "service:Atlas Treasury Platform",
        "targetNode": "asset:Core banking client transport",
        "relationship": "USES",
        "evidence": "Java AST scanner · jsse-rsa · source evidence",
        "confidence": 93
      },
      {
        "sourceNode": "asset:Core banking client transport",
        "targetNode": "algorithm:RSA-2048",
        "relationship": "IMPLEMENTS",
        "evidence": "AST matcher found RSA key manager initialisation in transaction TLS client.",
        "confidence": 93
      },
      {
        "sourceNode": "algorithm:RSA-2048",
        "targetNode": "data:Secret data",
        "relationship": "PROTECTS",
        "evidence": "Inter-bank transaction transport",
        "confidence": 85
      },
      {
        "sourceNode": "service:Atlas Treasury Platform",
        "targetNode": "library:Java JSSE 17",
        "relationship": "DEPENDS_ON",
        "evidence": "Java AST scanner · jsse-rsa · source evidence",
        "confidence": 89
      },
      {
        "sourceNode": "library:Java JSSE 17",
        "targetNode": "algorithm:RSA-2048",
        "relationship": "SUPPORTS",
        "evidence": "AST matcher found RSA key manager initialisation in transaction TLS client.",
        "confidence": 87
      },
      {
        "sourceNode": "endpoint:java enterprise public boundary",
        "targetNode": "asset:Core banking client transport",
        "relationship": "EXPOSES",
        "evidence": "Inter-bank transaction transport",
        "confidence": 93
      },
      {
        "sourceNode": "service:Atlas Treasury Platform",
        "targetNode": "asset:Treasury document signer",
        "relationship": "USES",
        "evidence": "Java AST scanner · jca-ecdsa · source evidence",
        "confidence": 89
      },
      {
        "sourceNode": "asset:Treasury document signer",
        "targetNode": "algorithm:ECDSA P-384",
        "relationship": "IMPLEMENTS",
        "evidence": "JCA provider registration and EC signature algorithm selection were observed.",
        "confidence": 89
      },
      {
        "sourceNode": "algorithm:ECDSA P-384",
        "targetNode": "data:Secret data",
        "relationship": "PROTECTS",
        "evidence": "Treasury approval document signing through HSM",
        "confidence": 81
      },
      {
        "sourceNode": "service:Atlas Treasury Platform",
        "targetNode": "library:Bouncy Castle 1.78",
        "relationship": "DEPENDS_ON",
        "evidence": "Java AST scanner · jca-ecdsa · source evidence",
        "confidence": 85
      },
      {
        "sourceNode": "library:Bouncy Castle 1.78",
        "targetNode": "algorithm:ECDSA P-384",
        "relationship": "SUPPORTS",
        "evidence": "JCA provider registration and EC signature algorithm selection were observed.",
        "confidence": 83
      },
      {
        "sourceNode": "service:Atlas Treasury Platform",
        "targetNode": "asset:Ledger archive encryption",
        "relationship": "USES",
        "evidence": "Java AST scanner · jce-aes-gcm · source evidence",
        "confidence": 96
      },
      {
        "sourceNode": "asset:Ledger archive encryption",
        "targetNode": "algorithm:AES-256-GCM",
        "relationship": "IMPLEMENTS",
        "evidence": "Cipher.getInstance uses AES/GCM/NoPadding with an observed 256-bit configuration.",
        "confidence": 96
      },
      {
        "sourceNode": "algorithm:AES-256-GCM",
        "targetNode": "data:Confidential data",
        "relationship": "PROTECTS",
        "evidence": "Long-term transaction archive encryption",
        "confidence": 88
      },
      {
        "sourceNode": "service:Atlas Treasury Platform",
        "targetNode": "library:Java JCE 17",
        "relationship": "DEPENDS_ON",
        "evidence": "Java AST scanner · jce-aes-gcm · source evidence",
        "confidence": 92
      },
      {
        "sourceNode": "library:Java JCE 17",
        "targetNode": "algorithm:AES-256-GCM",
        "relationship": "SUPPORTS",
        "evidence": "Cipher.getInstance uses AES/GCM/NoPadding with an observed 256-bit configuration.",
        "confidence": 90
      }
    ],
    "waves": [
      {
        "wave": 1,
        "title": "Remove immediate classical weaknesses",
        "rationale": "Retire deprecated protocols and integrity primitives before expanding the PQC rollout.",
        "scope": "Legacy protocol configuration and deprecated hash usages",
        "indicativeEffort": "Indicative: 1–2 engineer-weeks",
        "dependencies": "Partner compatibility test plan"
      },
      {
        "wave": 2,
        "title": "Upgrade shared cryptographic dependencies",
        "rationale": "A shared dependency update reduces repeated remediation across connected services.",
        "scope": "Base images, shared libraries, and certificate tooling",
        "indicativeEffort": "Indicative: 2–5 engineer-weeks",
        "dependencies": "Regression suite and deployment canary"
      },
      {
        "wave": 3,
        "title": "Introduce hybrid quantum-safe paths",
        "rationale": "Prioritise long-lived confidential data and externally exposed cryptographic boundaries.",
        "scope": "Key establishment, signature flows, and key-management integration",
        "indicativeEffort": "Indicative: 4–10 engineer-weeks",
        "dependencies": "Protocol peer support and platform-library validation"
      }
    ]
  },
  {
    "id": "container-mesh",
    "label": "Container microservices",
    "displayName": "Orion Logistics Mesh",
    "description": "A containerised service mesh where a shared base image creates a broad remediation opportunity.",
    "repositoryPlaceholder": "registry.example.com/orion/edge-base:latest",
    "badges": [
      "OCI image",
      "Shared dependency",
      "Service mesh"
    ],
    "totalAssets": 116,
    "criticalCount": 7,
    "quantumVulnerableCount": 44,
    "hndlCount": 2,
    "quantumReadiness": 41,
    "findings": [
      {
        "findingKey": "ctr-openssl",
        "assetName": "Shared edge base image",
        "assetType": "Container image",
        "algorithm": "OpenSSL 1.1.1",
        "cryptoRole": "Cryptographic library",
        "library": "OpenSSL",
        "version": "1.1.1w",
        "sourceLocation": "registry/logistics/edge-base@sha256:0d7…",
        "usageContext": "Shared base image for API, auth, and worker services",
        "dataState": "In use",
        "environment": "Containerized production",
        "sensitivity": "Confidential",
        "criticality": "Critical",
        "classicalRisk": "High",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 15,
        "migrationMonths": 10,
        "confidence": 87,
        "evidence": "Package inventory and layer manifest identify libssl 1.1.1w in a shared base image.",
        "provenance": "Container scanner · OCI layer inventory · package metadata",
        "riskLevel": "High",
        "hndlExposure": true
      },
      {
        "findingKey": "ctr-tls10",
        "assetName": "Legacy routing gateway",
        "assetType": "Protocol configuration",
        "algorithm": "TLS 1.0",
        "cryptoRole": "Transport protocol",
        "library": "nginx",
        "version": "1.22",
        "sourceLocation": "gateway/nginx.conf:90",
        "usageContext": "Legacy carrier integration endpoint",
        "dataState": "In transit",
        "environment": "Containerized production",
        "sensitivity": "Internal",
        "criticality": "High",
        "classicalRisk": "High",
        "quantumRisk": "Medium",
        "quantumVulnerable": false,
        "dataLifetimeYears": 4,
        "migrationMonths": 4,
        "confidence": 99,
        "evidence": "Configuration parser found TLSv1 enabled in the server protocol list.",
        "provenance": "Protocol scanner · nginx-tls-version · verified configuration parse",
        "riskLevel": "Low",
        "hndlExposure": false
      },
      {
        "findingKey": "ctr-rsa-cert",
        "assetName": "Fleet API certificate",
        "assetType": "Certificate",
        "algorithm": "RSA-2048",
        "cryptoRole": "Digital signature",
        "library": "X.509",
        "version": null,
        "sourceLocation": "secrets/fleet-api.pem",
        "usageContext": "Fleet API public certificate",
        "dataState": "In transit",
        "environment": "Containerized production",
        "sensitivity": "Confidential",
        "criticality": "High",
        "classicalRisk": "Low",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 8,
        "migrationMonths": 9,
        "confidence": 100,
        "evidence": "X.509 parser read RSA public key metadata and certificate chain details.",
        "provenance": "Certificate scanner · x509-parse · DER metadata",
        "riskLevel": "Low",
        "hndlExposure": false
      }
    ],
    "recommendations": [
      {
        "findingKey": "ctr-openssl",
        "recommendationType": "Integrity modernisation",
        "title": "Retire legacy integrity primitive in Shared edge base image",
        "candidate": "SHA-3-256 with format-versioning",
        "migrationNotes": "Context: in use data in containerized production. Business criticality: critical; data sensitivity: confidential. Observed use: Shared base image for API, auth, and worker services. Update format identifiers and verify interoperability before deprecating the legacy digest. Validate the updated runtime through a signed base-image rollout.",
        "compatibility": "Coordinate long-retention archive formats, downstream verifiers, and recorded evidence chains.",
        "indicativeEffort": "Indicative: 2–4 engineer-weeks",
        "indicativeLatency": "Indicative: no material user-visible latency",
        "priority": 2
      },
      {
        "findingKey": "ctr-tls10",
        "recommendationType": "Integrity modernisation",
        "title": "Retire legacy integrity primitive in Legacy routing gateway",
        "candidate": "SHA-256 or SHA-3-256, depending on protocol support",
        "migrationNotes": "Context: in transit data in containerized production. Business criticality: high; data sensitivity: internal. Observed use: Legacy carrier integration endpoint. Update format identifiers and verify interoperability before deprecating the legacy digest. Validate the updated runtime through a signed base-image rollout.",
        "compatibility": "Coordinate changes with downstream verifiers and stored signature formats.",
        "indicativeEffort": "Indicative: 3–8 engineering days",
        "indicativeLatency": "Indicative: no material user-visible latency",
        "priority": 11
      },
      {
        "findingKey": "ctr-rsa-cert",
        "recommendationType": "Hybrid signature",
        "title": "Plan a signature migration for Fleet API certificate",
        "candidate": "Hybrid X.509 profile with ECDSA + ML-DSA-65",
        "migrationNotes": "Context: in transit data in containerized production. Business criticality: high; data sensitivity: confidential. Observed use: Fleet API public certificate. Introduce dual-verification and update certificate, token, or document-signing consumers in dependency order. Validate the updated runtime through a signed base-image rollout.",
        "compatibility": "Certificate profile, issuing chain, verifier support, signature size, and rollover sequence must be tested together.",
        "indicativeEffort": "Indicative: 5–10 engineer-weeks",
        "indicativeLatency": "Indicative: +4–12 ms per signing operation",
        "priority": 3
      }
    ],
    "relationships": [
      {
        "sourceNode": "service:Orion Logistics Mesh",
        "targetNode": "asset:Shared edge base image",
        "relationship": "USES",
        "evidence": "Container scanner · OCI layer inventory · package metadata",
        "confidence": 87
      },
      {
        "sourceNode": "asset:Shared edge base image",
        "targetNode": "algorithm:OpenSSL 1.1.1",
        "relationship": "IMPLEMENTS",
        "evidence": "Package inventory and layer manifest identify libssl 1.1.1w in a shared base image.",
        "confidence": 87
      },
      {
        "sourceNode": "algorithm:OpenSSL 1.1.1",
        "targetNode": "data:Confidential data",
        "relationship": "PROTECTS",
        "evidence": "Shared base image for API, auth, and worker services",
        "confidence": 79
      },
      {
        "sourceNode": "service:Orion Logistics Mesh",
        "targetNode": "library:OpenSSL 1.1.1w",
        "relationship": "DEPENDS_ON",
        "evidence": "Container scanner · OCI layer inventory · package metadata",
        "confidence": 83
      },
      {
        "sourceNode": "library:OpenSSL 1.1.1w",
        "targetNode": "algorithm:OpenSSL 1.1.1",
        "relationship": "SUPPORTS",
        "evidence": "Package inventory and layer manifest identify libssl 1.1.1w in a shared base image.",
        "confidence": 81
      },
      {
        "sourceNode": "service:Orion Logistics Mesh",
        "targetNode": "asset:Legacy routing gateway",
        "relationship": "USES",
        "evidence": "Protocol scanner · nginx-tls-version · verified configuration parse",
        "confidence": 99
      },
      {
        "sourceNode": "asset:Legacy routing gateway",
        "targetNode": "algorithm:TLS 1.0",
        "relationship": "IMPLEMENTS",
        "evidence": "Configuration parser found TLSv1 enabled in the server protocol list.",
        "confidence": 99
      },
      {
        "sourceNode": "algorithm:TLS 1.0",
        "targetNode": "data:Internal data",
        "relationship": "PROTECTS",
        "evidence": "Legacy carrier integration endpoint",
        "confidence": 91
      },
      {
        "sourceNode": "service:Orion Logistics Mesh",
        "targetNode": "library:nginx 1.22",
        "relationship": "DEPENDS_ON",
        "evidence": "Protocol scanner · nginx-tls-version · verified configuration parse",
        "confidence": 95
      },
      {
        "sourceNode": "library:nginx 1.22",
        "targetNode": "algorithm:TLS 1.0",
        "relationship": "SUPPORTS",
        "evidence": "Configuration parser found TLSv1 enabled in the server protocol list.",
        "confidence": 93
      },
      {
        "sourceNode": "endpoint:container mesh public boundary",
        "targetNode": "asset:Legacy routing gateway",
        "relationship": "EXPOSES",
        "evidence": "Legacy carrier integration endpoint",
        "confidence": 99
      },
      {
        "sourceNode": "service:Orion Logistics Mesh",
        "targetNode": "certificate:Fleet API certificate",
        "relationship": "USES_CERTIFICATE",
        "evidence": "Certificate scanner · x509-parse · DER metadata",
        "confidence": 100
      },
      {
        "sourceNode": "certificate:Fleet API certificate",
        "targetNode": "algorithm:RSA-2048",
        "relationship": "SIGNED_WITH",
        "evidence": "X.509 parser read RSA public key metadata and certificate chain details.",
        "confidence": 100
      },
      {
        "sourceNode": "algorithm:RSA-2048",
        "targetNode": "data:Confidential data",
        "relationship": "PROTECTS",
        "evidence": "Fleet API public certificate",
        "confidence": 92
      },
      {
        "sourceNode": "service:Orion Logistics Mesh",
        "targetNode": "library:X.509 observed",
        "relationship": "DEPENDS_ON",
        "evidence": "Certificate scanner · x509-parse · DER metadata",
        "confidence": 96
      },
      {
        "sourceNode": "library:X.509 observed",
        "targetNode": "algorithm:RSA-2048",
        "relationship": "SUPPORTS",
        "evidence": "X.509 parser read RSA public key metadata and certificate chain details.",
        "confidence": 94
      },
      {
        "sourceNode": "endpoint:container mesh public boundary",
        "targetNode": "certificate:Fleet API certificate",
        "relationship": "PRESENTS_CERTIFICATE",
        "evidence": "Fleet API public certificate",
        "confidence": 100
      }
    ],
    "waves": [
      {
        "wave": 1,
        "title": "Remove immediate classical weaknesses",
        "rationale": "Retire deprecated protocols and integrity primitives before expanding the PQC rollout.",
        "scope": "Legacy protocol configuration and deprecated hash usages",
        "indicativeEffort": "Indicative: 1–2 engineer-weeks",
        "dependencies": "Partner compatibility test plan"
      },
      {
        "wave": 2,
        "title": "Upgrade shared cryptographic dependencies",
        "rationale": "A shared dependency update reduces repeated remediation across connected services.",
        "scope": "Base images, shared libraries, and certificate tooling",
        "indicativeEffort": "Indicative: 2–5 engineer-weeks",
        "dependencies": "Regression suite and deployment canary"
      },
      {
        "wave": 3,
        "title": "Introduce hybrid quantum-safe paths",
        "rationale": "Prioritise long-lived confidential data and externally exposed cryptographic boundaries.",
        "scope": "Key establishment, signature flows, and key-management integration",
        "indicativeEffort": "Indicative: 4–10 engineer-weeks",
        "dependencies": "Protocol peer support and platform-library validation"
      }
    ]
  },
  {
    "id": "compliance-heavy",
    "label": "Compliance-heavy system",
    "displayName": "Sovereign Records Portal",
    "description": "A sensitive records environment with long-retention data, certificate authorities, and inter-agency transport.",
    "repositoryPlaceholder": "https://github.com/acme/sovereign-records",
    "badges": [
      "Long retention",
      "PKI",
      "High assurance"
    ],
    "totalAssets": 154,
    "criticalCount": 14,
    "quantumVulnerableCount": 76,
    "hndlCount": 11,
    "quantumReadiness": 18,
    "findings": [
      {
        "findingKey": "gov-rsa-cert",
        "assetName": "Citizen records signing CA",
        "assetType": "Certificate authority",
        "algorithm": "RSA-4096",
        "cryptoRole": "Digital signature",
        "library": "Enterprise PKI",
        "version": null,
        "sourceLocation": "pki/issuing-ca-profile.yaml:31",
        "usageContext": "Citizen records document signature chain",
        "dataState": "In use",
        "environment": "On-premises",
        "sensitivity": "Top secret",
        "criticality": "Critical",
        "classicalRisk": "Low",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 50,
        "migrationMonths": 36,
        "confidence": 92,
        "evidence": "PKI profile references an RSA 4096-bit issuing key for long-retention signed records.",
        "provenance": "Configuration scanner · pki-rsa-profile · source evidence",
        "riskLevel": "Critical",
        "hndlExposure": true
      },
      {
        "findingKey": "gov-dh-vpn",
        "assetName": "Inter-agency VPN profile",
        "assetType": "Protocol configuration",
        "algorithm": "Diffie-Hellman 2048",
        "cryptoRole": "Key exchange",
        "library": "strongSwan",
        "version": "5.9",
        "sourceLocation": "vpn/interagency.conf:64",
        "usageContext": "Inter-agency sensitive-data transport",
        "dataState": "In transit",
        "environment": "On-premises",
        "sensitivity": "Secret",
        "criticality": "Critical",
        "classicalRisk": "Medium",
        "quantumRisk": "High",
        "quantumVulnerable": true,
        "dataLifetimeYears": 30,
        "migrationMonths": 18,
        "confidence": 96,
        "evidence": "VPN profile explicitly selects a MODP 2048 Diffie-Hellman proposal.",
        "provenance": "Protocol scanner · ipsec-dh-group · verified configuration parse",
        "riskLevel": "Critical",
        "hndlExposure": true
      },
      {
        "findingKey": "gov-md5-archive",
        "assetName": "Legacy evidence archive checksum",
        "assetType": "Source code",
        "algorithm": "MD5",
        "cryptoRole": "Integrity verification",
        "library": "Apache Commons Codec",
        "version": "1.16",
        "sourceLocation": "archive/ChecksumVerifier.java:39",
        "usageContext": "Evidence archive checksum verification",
        "dataState": "At rest",
        "environment": "On-premises",
        "sensitivity": "Secret",
        "criticality": "High",
        "classicalRisk": "High",
        "quantumRisk": "Medium",
        "quantumVulnerable": false,
        "dataLifetimeYears": 20,
        "migrationMonths": 5,
        "confidence": 98,
        "evidence": "AST matcher found DigestUtils.md5Hex in the evidence verification path.",
        "provenance": "Java AST scanner · deprecated-md5 · source evidence",
        "riskLevel": "Critical",
        "hndlExposure": false
      }
    ],
    "recommendations": [
      {
        "findingKey": "gov-rsa-cert",
        "recommendationType": "Hybrid signature",
        "title": "Plan a signature migration for Citizen records signing CA",
        "candidate": "Hybrid X.509 profile with ECDSA + ML-DSA-65",
        "migrationNotes": "Context: in use data in on-premises. Business criticality: critical; data sensitivity: top secret. Observed use: Citizen records document signature chain. Introduce dual-verification and update certificate, token, or document-signing consumers in dependency order. Confirm HSM, PKI, and platform-provider support before rollout.",
        "compatibility": "Certificate profile, issuing chain, verifier support, signature size, and rollover sequence must be tested together.",
        "indicativeEffort": "Indicative: 5–10 engineer-weeks",
        "indicativeLatency": "Indicative: +4–12 ms per signing operation",
        "priority": 1
      },
      {
        "findingKey": "gov-dh-vpn",
        "recommendationType": "Hybrid key establishment",
        "title": "Stage a hybrid key-establishment path for Inter-agency VPN profile",
        "candidate": "X25519 + ML-KEM-1024",
        "migrationNotes": "Context: in transit data in on-premises. Business criticality: critical; data sensitivity: secret. Observed use: Inter-agency sensitive-data transport. Validate TLS or application protocol support in a canary path before changing the default handshake. Confirm HSM, PKI, and platform-provider support before rollout.",
        "compatibility": "Requires peer support, a tested fallback strategy, and explicit prioritisation because the observed data is high-sensitivity in transit.",
        "indicativeEffort": "Indicative: 4–8 engineer-weeks",
        "indicativeLatency": "Indicative: +2–6 ms per negotiated session",
        "priority": 2
      },
      {
        "findingKey": "gov-md5-archive",
        "recommendationType": "Integrity modernisation",
        "title": "Retire legacy integrity primitive in Legacy evidence archive checksum",
        "candidate": "SHA-3-256 with format-versioning",
        "migrationNotes": "Context: at rest data in on-premises. Business criticality: high; data sensitivity: secret. Observed use: Evidence archive checksum verification. Update format identifiers and verify interoperability before deprecating the legacy digest. Confirm HSM, PKI, and platform-provider support before rollout.",
        "compatibility": "Coordinate long-retention archive formats, downstream verifiers, and recorded evidence chains.",
        "indicativeEffort": "Indicative: 2–4 engineer-weeks",
        "indicativeLatency": "Indicative: no material user-visible latency",
        "priority": 4
      }
    ],
    "relationships": [
      {
        "sourceNode": "service:Sovereign Records Portal",
        "targetNode": "certificate-authority:Citizen records signing CA",
        "relationship": "USES_CERTIFICATE",
        "evidence": "Configuration scanner · pki-rsa-profile · source evidence",
        "confidence": 92
      },
      {
        "sourceNode": "certificate-authority:Citizen records signing CA",
        "targetNode": "algorithm:RSA-4096",
        "relationship": "SIGNED_WITH",
        "evidence": "PKI profile references an RSA 4096-bit issuing key for long-retention signed records.",
        "confidence": 92
      },
      {
        "sourceNode": "algorithm:RSA-4096",
        "targetNode": "data:Top secret data",
        "relationship": "PROTECTS",
        "evidence": "Citizen records document signature chain",
        "confidence": 84
      },
      {
        "sourceNode": "service:Sovereign Records Portal",
        "targetNode": "library:Enterprise PKI observed",
        "relationship": "DEPENDS_ON",
        "evidence": "Configuration scanner · pki-rsa-profile · source evidence",
        "confidence": 88
      },
      {
        "sourceNode": "library:Enterprise PKI observed",
        "targetNode": "algorithm:RSA-4096",
        "relationship": "SUPPORTS",
        "evidence": "PKI profile references an RSA 4096-bit issuing key for long-retention signed records.",
        "confidence": 86
      },
      {
        "sourceNode": "certificate-authority:Citizen records signing CA",
        "targetNode": "certificate:Citizen records signing CA issuing profile",
        "relationship": "ISSUES",
        "evidence": "Citizen records document signature chain",
        "confidence": 87
      },
      {
        "sourceNode": "service:Sovereign Records Portal",
        "targetNode": "asset:Inter-agency VPN profile",
        "relationship": "USES",
        "evidence": "Protocol scanner · ipsec-dh-group · verified configuration parse",
        "confidence": 96
      },
      {
        "sourceNode": "asset:Inter-agency VPN profile",
        "targetNode": "algorithm:Diffie-Hellman 2048",
        "relationship": "IMPLEMENTS",
        "evidence": "VPN profile explicitly selects a MODP 2048 Diffie-Hellman proposal.",
        "confidence": 96
      },
      {
        "sourceNode": "algorithm:Diffie-Hellman 2048",
        "targetNode": "data:Secret data",
        "relationship": "PROTECTS",
        "evidence": "Inter-agency sensitive-data transport",
        "confidence": 88
      },
      {
        "sourceNode": "service:Sovereign Records Portal",
        "targetNode": "library:strongSwan 5.9",
        "relationship": "DEPENDS_ON",
        "evidence": "Protocol scanner · ipsec-dh-group · verified configuration parse",
        "confidence": 92
      },
      {
        "sourceNode": "library:strongSwan 5.9",
        "targetNode": "algorithm:Diffie-Hellman 2048",
        "relationship": "SUPPORTS",
        "evidence": "VPN profile explicitly selects a MODP 2048 Diffie-Hellman proposal.",
        "confidence": 90
      },
      {
        "sourceNode": "endpoint:compliance heavy public boundary",
        "targetNode": "asset:Inter-agency VPN profile",
        "relationship": "EXPOSES",
        "evidence": "Inter-agency sensitive-data transport",
        "confidence": 96
      },
      {
        "sourceNode": "service:Sovereign Records Portal",
        "targetNode": "asset:Legacy evidence archive checksum",
        "relationship": "USES",
        "evidence": "Java AST scanner · deprecated-md5 · source evidence",
        "confidence": 98
      },
      {
        "sourceNode": "asset:Legacy evidence archive checksum",
        "targetNode": "algorithm:MD5",
        "relationship": "IMPLEMENTS",
        "evidence": "AST matcher found DigestUtils.md5Hex in the evidence verification path.",
        "confidence": 98
      },
      {
        "sourceNode": "algorithm:MD5",
        "targetNode": "data:Secret data",
        "relationship": "PROTECTS",
        "evidence": "Evidence archive checksum verification",
        "confidence": 90
      },
      {
        "sourceNode": "service:Sovereign Records Portal",
        "targetNode": "library:Apache Commons Codec 1.16",
        "relationship": "DEPENDS_ON",
        "evidence": "Java AST scanner · deprecated-md5 · source evidence",
        "confidence": 94
      },
      {
        "sourceNode": "library:Apache Commons Codec 1.16",
        "targetNode": "algorithm:MD5",
        "relationship": "SUPPORTS",
        "evidence": "AST matcher found DigestUtils.md5Hex in the evidence verification path.",
        "confidence": 92
      }
    ],
    "waves": [
      {
        "wave": 1,
        "title": "Remove immediate classical weaknesses",
        "rationale": "Retire deprecated protocols and integrity primitives before expanding the PQC rollout.",
        "scope": "Legacy protocol configuration and deprecated hash usages",
        "indicativeEffort": "Indicative: 1–2 engineer-weeks",
        "dependencies": "Partner compatibility test plan"
      },
      {
        "wave": 2,
        "title": "Upgrade shared cryptographic dependencies",
        "rationale": "A shared dependency update reduces repeated remediation across connected services.",
        "scope": "Base images, shared libraries, and certificate tooling",
        "indicativeEffort": "Indicative: 2–5 engineer-weeks",
        "dependencies": "Regression suite and deployment canary"
      },
      {
        "wave": 3,
        "title": "Introduce hybrid quantum-safe paths",
        "rationale": "Prioritise long-lived confidential data and externally exposed cryptographic boundaries.",
        "scope": "Key establishment, signature flows, and key-management integration",
        "indicativeEffort": "Indicative: 4–10 engineer-weeks",
        "dependencies": "Protocol peer support and platform-library validation"
      }
    ]
  }
];
