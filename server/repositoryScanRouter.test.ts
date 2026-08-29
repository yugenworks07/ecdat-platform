import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ecdat", () => ({
  createRepositoryStaticScan: vi.fn(),
  createScenarioRun: vi.fn(),
  getExportPayload: vi.fn(),
  getScanDetail: vi.fn(),
  listUserScans: vi.fn(),
  saveMoscaAssumptions: vi.fn(),
}));

import { createRepositoryStaticScan } from "./ecdat";
import { appRouter } from "./routers";
import { RepositoryScanError } from "./scanners/repositoryScanner";
import type { TrpcContext } from "./_core/context";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 7, openId: "scanner-user", name: "Scanner User", email: null, loginMethod: "manus", role: "user", lastSignedIn: new Date(), createdAt: new Date(), updatedAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ecdat.scanRepository availability outcomes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns in-app recovery guidance instead of a mutation error for unavailable public repositories", async () => {
    vi.mocked(createRepositoryStaticScan).mockRejectedValue(new RepositoryScanError("GitHub repository metadata could not be read (HTTP 404).", "access"));
    const result = await appRouter.createCaller(authenticatedContext()).ecdat.scanRepository({ repositoryUrl: "https://github.com/example/missing" });
    expect(result).toEqual({ status: "unavailable", message: "That public GitHub repository could not be read. Check that the repository exists and is publicly accessible." });
  });

  it("keeps a rate-limit message inside the successful mutation response contract", async () => {
    vi.mocked(createRepositoryStaticScan).mockRejectedValue(new RepositoryScanError("GitHub is temporarily limiting repository analysis. Retry after 2:17 PM.", "rate-limit"));
    const result = await appRouter.createCaller(authenticatedContext()).ecdat.scanRepository({ repositoryUrl: "https://github.com/example/limited" });
    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("GitHub is temporarily limiting repository analysis.");
  });
});
