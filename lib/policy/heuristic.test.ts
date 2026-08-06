import { describe, expect, it } from "vitest";
import { tryParsePolicyTextHeuristic } from "./heuristic";
import {
  isGenericRecipientLabel,
  meaningfulRecipientLabel,
} from "./labels";

describe("tryParsePolicyTextHeuristic", () => {
  it("parses respectively-style 30/70 with two addresses and no fake r1/r2", () => {
    const draft = tryParsePolicyTextHeuristic(
      "share 30% and 70% respectively for 0x23282e795ea127F794Ed5F3D2c6c0a47aFeA524F and 0x30326E0ACbC3f37bBF50Cf372DeFF1309F0270c5",
    );
    expect(draft).not.toBeNull();
    expect(draft!.recipients).toHaveLength(2);
    expect(draft!.recipients[0]!.bps).toBe(3000);
    expect(draft!.recipients[1]!.bps).toBe(7000);
    expect(draft!.recipients[0]!.address.toLowerCase()).toBe(
      "0x23282e795ea127f794ed5f3d2c6c0a47afea524f",
    );
    expect(draft!.recipients[0]!.label).toBeUndefined();
    expect(draft!.recipients[1]!.label).toBeUndefined();
  });

  it("parses to-style percents with ENS + hex", () => {
    const draft = tryParsePolicyTextHeuristic(
      "Split 60% to vitalik.eth and 40% to 0x1111111111111111111111111111111111111111",
    );
    expect(draft).not.toBeNull();
    expect(draft!.recipients.map((r) => r.bps)).toEqual([6000, 4000]);
    expect(draft!.recipients[0]!.address).toBe("vitalik.eth");
    expect(draft!.recipients[0]!.label).toBe("vitalik");
    expect(draft!.recipients[1]!.label).toBeUndefined();
  });

  it("captures purpose labels when provided", () => {
    const draft = tryParsePolicyTextHeuristic(
      "Split 20% Finance 0x1111111111111111111111111111111111111111, 80% Ops 0x2222222222222222222222222222222222222222",
    );
    expect(draft).not.toBeNull();
    expect(draft!.recipients.map((r) => r.label)).toEqual(["Finance", "Ops"]);
    expect(draft!.recipients.map((r) => r.bps)).toEqual([2000, 8000]);
  });

  it("returns null when percent count mismatches addresses", () => {
    expect(
      tryParsePolicyTextHeuristic(
        "30% and 70% to 0x23282e795ea127F794Ed5F3D2c6c0a47aFeA524F",
      ),
    ).toBeNull();
  });

  it("returns null for free-form text without structure", () => {
    expect(
      tryParsePolicyTextHeuristic("pay the team fairly somehow"),
    ).toBeNull();
  });
});

describe("meaningfulRecipientLabel", () => {
  it("treats r1/r2 and recipientN as generic", () => {
    expect(isGenericRecipientLabel("r1")).toBe(true);
    expect(isGenericRecipientLabel("R-2")).toBe(true);
    expect(isGenericRecipientLabel("recipient 1")).toBe(true);
    expect(meaningfulRecipientLabel("Finance")).toBe("Finance");
    expect(meaningfulRecipientLabel("r1")).toBeUndefined();
  });
});
