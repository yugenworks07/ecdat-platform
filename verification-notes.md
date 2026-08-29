# Managed Preview Verification

The managed full-stack preview was verified on 2026-08-28 after the final migration state and the inventory table warning fix.

| Route | Verified result |
| --- | --- |
| `/` Command Center | Rendered the seeded Mercury Payments API workspace with 47 assets, 4 findings, 2 quantum-vulnerable findings, 2 potential HNDL findings, 34% quantum readiness, 3 generated actions, and 22 evidence links. |
| `/inventory` CBOM inventory | Rendered 47 observed assets, 4 evidence records, 2 quantum-vulnerable findings, 2 potential HNDL findings, 2 services/endpoints, 8 libraries, and four populated finding rows. |
| `/graph` Dependency Graph | Rendered the seeded graph with 16 nodes, 22 edges, scope controls, depth controls, zoom controls, and progressive investigation content. |
| `/migration` Migration roadmap | Rendered 34% readiness, 47 crypto assets, 23 quantum-vulnerable findings, 5 high/critical findings, 3 potential HNDL findings, a prioritisation matrix, three migration waves, and generated target paths. |
| `/pqc-dashboard` Enterprise PQC readiness | Rendered 34% readiness for Mercury Payments API, 47 assets, two recommended actions, three prioritised candidates, three migration waves, and export controls. |
| `/reports` Evidence & Reports | Rendered the seeded demo preview with 47 assets, 2 high/critical findings, 23 quantum-vulnerable findings, 34% readiness, 100% evidence coverage across 4 findings, report packages, evidence chain, and export controls. |
| `/remediation-queue` Remediation Queue | Rendered scan `SCAN-104` with severity filters, three prioritised findings, Mosca signals, affected relationship counts, and Open Lab actions. |

The final reload of `/inventory` reported no browser-console output after removing the invalid whitespace text node inside its table row. The current post-restart dev-server log check reported no new module, hydration, unhandled, or failed-network errors. The earlier `fflate` module message was stale and occurred before dependencies were installed and the server was restarted.
