import { describe, expect, it } from "vitest";
import { buildRemediationEvidenceHtml, invokeEvidencePdfExport } from "./remediationEvidenceHtml";
import { buildRemediationContext, canEnterPhase, fallbackFinding, remediationLabPath, remediationLabWindowPath, routePart } from "./remediationLab";

describe("routed Remediation Lab context", () => {
  it("creates a stable, scoped remediation workspace from a finding", () => {
    const context = buildRemediationContext({
      scanId: "scan-104",
      findingId: "finding-rsa-017",
      finding: fallbackFinding,
      relationshipCount: 3,
    });

    expect(context.workspaceId).toBe("RL-104-017");
    expect(context.riskScore).toBe(82);
    expect(context.riskAfter).toBe(34);
    expect(context.impactedServices).toContain("auth-service");
    expect(context.migrationPlan).toHaveLength(4);
    expect(remediationLabPath(context)).toBe("/remediation-lab/scan-104/finding-rsa-017");
    expect(remediationLabWindowPath(context)).toBe("/remediation-lab.html?scanId=scan-104&findingId=finding-rsa-017");
  });

  it("normalizes untrusted route values and retains a safe fallback", () => {
    expect(routePart(" scan 104 / test ", "scan-104")).toBe("scan-104-test");
    expect(routePart("---", "scan-104")).toBe("scan-104");
  });

  it("keeps future phases inaccessible until the previous phase unlocks them", () => {
    expect(canEnterPhase(1, 1)).toBe(true);
    expect(canEnterPhase(2, 1)).toBe(false);
    expect(canEnterPhase(5, 4)).toBe(false);
    expect(canEnterPhase(5, 5)).toBe(true);
  });

  it("builds a self-contained, escaped browser-local HTML evidence report", () => {
    const context = buildRemediationContext({
      scanId: "scan-104",
      findingId: "finding-rsa-017",
      finding: { ...fallbackFinding, assetName: "Payment <TLS>", sourceLocation: "infra/<nginx>.conf:18" },
      recommendation: { findingKey: "finding-rsa-017", candidate: "Validate <HSM> support", title: "", migrationNotes: "", compatibility: "", indicativeEffort: "", indicativeLatency: "" },
    });

    const report = buildRemediationEvidenceHtml(context, "2026-08-27T00:00:00.000Z");

    expect(report).toContain("<title>ECDAT evidence — RL-104-017</title>");
    expect(report).toContain("Payment &lt;TLS&gt;");
    expect(report).toContain("Validate &lt;HSM&gt; support");
    expect(report).not.toContain("Payment <TLS>");
    expect(report).toContain("browser-local evidence fixture");
    expect(report).toContain("does not represent a production change");
  });

  it("delegates the PDF export action to the supplied browser print handler", () => {
    let printInvocations = 0;

    invokeEvidencePdfExport(() => { printInvocations += 1; });

    expect(printInvocations).toBe(1);
  });
});
