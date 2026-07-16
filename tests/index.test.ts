import { readFileSync } from "node:fs";

const nativeModule = {
  configure: jest.fn().mockResolvedValue(undefined),
  handle: jest.fn(),
  getDeferredDeepLink: jest.fn(),
  setProfileConsent: jest.fn().mockResolvedValue(undefined),
  identify: jest.fn().mockResolvedValue(undefined),
  updateUser: jest.fn().mockResolvedValue(undefined),
  setReportedAttribution: jest.fn().mockResolvedValue(undefined),
  resetIdentity: jest.fn().mockResolvedValue(undefined),
  track: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
};

jest.mock("react-native", () => ({
  TurboModuleRegistry: { getEnforcing: () => nativeModule },
}));

import { WtsSdk, WtsSdkError } from "../src";

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
    nativeModule.handle.mockRejectedValueOnce({ code: "TIMEOUT", message: "Request timed out" });

    await expect(WtsSdk.handle("https://demo.links.wts.is/summer")).rejects.toEqual(
      expect.objectContaining({
        code: "TIMEOUT",
        fallbackUrl: "https://demo.links.wts.is/summer",
      }),
    );
  });

  it("normalizes non-handle native failures into WtsSdkError", async () => {
    nativeModule.identify.mockRejectedValueOnce({
      code: "PROFILE_CONSENT_REQUIRED",
      message: "Consent is required",
    });

    try {
      await WtsSdk.identify("customer_1842");
      throw new Error("Expected identify to reject.");
    } catch (error) {
      expect(error).toBeInstanceOf(WtsSdkError);
      expect(error).toEqual(
        expect.objectContaining({
          name: "WtsSdkError",
          code: "PROFILE_CONSENT_REQUIRED",
        }),
      );
    }
  });

  it("decodes the canonical resolve fixture without scalar coercion", async () => {
    const fixture = JSON.parse(
      readFileSync("contracts/mobile/v2/fixtures/resolve-success.json", "utf8"),
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

  it("keeps Date and ISO-looking strings distinct across the native bridge", async () => {
    await WtsSdk.identify("customer_1842", {
      created_at: new Date("2026-07-16T10:00:00.000Z"),
      imported_at: "2026-07-16T10:00:00.000Z",
      plan: "enterprise",
    });

    expect(nativeModule.identify).toHaveBeenCalledWith("customer_1842", {
      created_at: { kind: "date", value: "2026-07-16T10:00:00.000Z" },
      imported_at: { kind: "string", value: "2026-07-16T10:00:00.000Z" },
      plan: { kind: "string", value: "enterprise" },
    });
  });

  it("preserves opaque external user IDs without trimming", async () => {
    await WtsSdk.identify(" customer_1842 ");

    expect(nativeModule.identify).toHaveBeenCalledWith(" customer_1842 ", {});
  });
});
