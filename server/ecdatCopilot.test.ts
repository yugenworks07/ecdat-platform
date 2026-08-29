import { describe, expect, it } from "vitest";
import { buildCopilotOutputSchema, parseCopilotReply } from "./ecdatCopilot";

describe("ECDAT copilot safeguards", () => {
  it("allow-lists structured focus actions to current scan findings", () => {
    const schema = buildCopilotOutputSchema(["finding-rsa", "finding-ecdsa"]);
    expect(schema.schema.properties.focusFindingKey).toMatchObject({ enum: ["finding-rsa", "finding-ecdsa", null] });
    expect(parseCopilotReply('{"content":"Prioritize RSA.","focusFindingKey":"finding-rsa"}', ["finding-rsa"])).toEqual({ content: "Prioritize RSA.", focusFindingKey: "finding-rsa" });
    expect(parseCopilotReply('{"content":"Unknown evidence.","focusFindingKey":"not-in-scan"}', ["finding-rsa"])).toEqual({ content: "Unknown evidence.", focusFindingKey: null });
  });

  it("keeps an available text response if an upstream reply is not structured JSON", () => {
    expect(parseCopilotReply("Use the observed migration path.", ["finding-rsa"])).toEqual({ content: "Use the observed migration path.", focusFindingKey: null });
  });
});
