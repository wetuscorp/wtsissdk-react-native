import { readFileSync } from "node:fs";

const nativeModule = {
  configure: jest.fn().mockResolvedValue(undefined),
  handle: jest.fn(),
  getDeferredDeepLink: jest.fn(),
  track: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
};

jest.mock("react-native", () => ({
  TurboModuleRegistry: { getEnforcing: () => nativeModule },
}));

import { WtsSdk } from "../src";

describe("WtsSdk", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes revenue currency before calling the native core", async () => {
    await WtsSdk.track("purchase", { order_id: "42" }, { amount: "12.50", currency: "try" });

    expect(nativeModule.track).toHaveBeenCalledWith(
      "purchase",
      { order_id: "42" },
      "12.50",
      "TRY",
      null,
    );
  });

  it("rejects non-scalar properties before calling the native core", () => {
    expect(() =>
      WtsSdk.track("purchase", { nested: {} as never }),
    ).toThrow("Event properties must be string, number, or boolean.");
    expect(nativeModule.track).not.toHaveBeenCalled();
  });

  it("rejects invalid event keys", () => {
    expect(() => WtsSdk.track("Purchase Event")).toThrow(
      "eventKey must use lowercase snake_case.",
    );
  });

  it("keeps the original URL on typed handle failures", async () => {
    nativeModule.handle.mockRejectedValueOnce({ code: "timeout", message: "Request timed out" });

    await expect(WtsSdk.handle("https://demo.links.wts.is/summer")).rejects.toEqual(
      expect.objectContaining({
        code: "timeout",
        fallbackUrl: "https://demo.links.wts.is/summer",
      }),
    );
  });

  it("decodes the canonical resolve fixture without scalar coercion", async () => {
    const fixture = JSON.parse(
      readFileSync("contracts/v1/fixtures/resolve-success.json", "utf8"),
    );
    nativeModule.handle.mockResolvedValueOnce({
      ...fixture.link,
      attributionId: fixture.attributionId,
      isDeferred: fixture.isDeferred,
      linkId: fixture.link.id,
    });

    const result = await WtsSdk.handle("https://demo.links.wts.is/summer");

    expect(result.parameters).toEqual({ campaign: "summer", featured: true });
    expect(result.linkId).toBe("link_example");
  });
});
