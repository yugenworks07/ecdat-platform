import { describe, expect, it } from "vitest";
import { collapseExpandedNode, expandNodesToDepth, expandedGraphScope, observedNeighborCount } from "./graphExpansion";

const relationships = [
  { sourceNode: "service:auth", targetNode: "library:pyjwt", relationship: "DEPENDS_ON", evidence: "manifest", confidence: 92 },
  { sourceNode: "library:pyjwt", targetNode: "algorithm:RSA-1024", relationship: "IMPLEMENTS", evidence: "source", confidence: 91 },
  { sourceNode: "service:auth", targetNode: "endpoint:api", relationship: "EXPOSES", evidence: "route", confidence: 93 },
];

describe("expandable graph disclosure", () => {
  it("reveals only explicitly expanded observed neighbors within the selected depth", () => {
    expect(expandedGraphScope("service:auth", new Set(), 3, relationships)).toEqual(new Set(["service:auth"]));
    expect(expandedGraphScope("service:auth", new Set(["service:auth"]), 1, relationships)).toEqual(new Set(["service:auth", "library:pyjwt", "endpoint:api"]));
    expect(expandedGraphScope("service:auth", new Set(["service:auth", "library:pyjwt"]), 2, relationships)).toEqual(new Set(["service:auth", "library:pyjwt", "endpoint:api", "algorithm:RSA-1024"]));
  });

  it("expands and counts only known relationship records", () => {
    expect(expandNodesToDepth("service:auth", 2, relationships)).toEqual(new Set(["service:auth", "library:pyjwt", "endpoint:api"]));
    expect(observedNeighborCount("service:auth", relationships)).toBe(2);
    expect(collapseExpandedNode("library:pyjwt", new Set(["service:auth", "library:pyjwt", "algorithm:RSA-1024"]), relationships, "service:auth")).toEqual(new Set(["service:auth"]));
  });
});
