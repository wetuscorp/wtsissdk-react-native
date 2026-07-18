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
  screen: jest.fn().mockResolvedValue(undefined),
  setExperienceConsent: jest.fn().mockResolvedValue("accepted"),
  presentNextExperience: jest.fn().mockResolvedValue(false),
  dismissCurrentExperience: jest.fn().mockResolvedValue(false),
  getExperienceDiagnostics: jest.fn().mockResolvedValue({
    enabled: true,
    consent: "contextual",
    queued: 0,
    presenting: false,
    testDeviceToken: "test-device-token",
  }),
  acknowledgeExperienceRender: jest.fn().mockResolvedValue({
    accepted: true,
    idempotent: false,
  }),
  acknowledgeExperienceImpression: jest.fn().mockResolvedValue({
    accepted: true,
    idempotent: true,
  }),
  reportExperienceAction: jest.fn().mockResolvedValue({
    accepted: true,
    idempotent: false,
  }),
  dismissExperience: jest.fn().mockResolvedValue({
    accepted: false,
    idempotent: false,
    code: "RENDER_FAILED",
  }),
  joinTestSession: jest.fn().mockResolvedValue({
    accepted: true,
    joined: true,
    compatible: true,
    checks: [{ key: "sdk_version", status: "passed" }],
    sessionId: "test-session-id",
  }),
  leaveTestSession: jest.fn().mockResolvedValue(true),
  getTestSessionDiagnostics: jest.fn().mockResolvedValue({
    joined: true,
    compatible: true,
    checks: [{ key: "sdk_version", status: "passed" }],
    pendingSignals: 2,
    sessionId: "test-session-id",
    expiresAt: "2026-07-18T12:00:00.000Z",
    lastErrorCode: "TEST_SESSION_RETRYING",
  }),
  probeTestSessionUrl: jest.fn().mockResolvedValue({
    match: true,
    status: "active",
    code: "OK",
    originalUrl: "https://notiword.wts.is/checkout?ignored=true",
    fallbackUrl: "https://personaleak.com/checkout",
    link: {
      id: "link_checkout",
      path: "/checkout",
      parametersJson: '{"coupon":"summer","member":true,"sourceId":42}',
    },
  }),
  runTestSessionProbes: jest.fn().mockResolvedValue({
    accepted: true,
    emitted: ["identity_recorded", "event_recorded"],
    skipped: [],
    pendingSignals: 0,
    experienceDecisionJson:
      '{"outcome":"ready","testGrant":{"grant":"test-grant"},"decision":{"campaignId":"campaign_checkout"}}',
  }),
  reportTestSessionExperienceInteraction: jest.fn().mockResolvedValue(true),
  onExperienceAvailable: jest.fn().mockReturnValue({ remove: jest.fn() }),
  onExperienceAction: jest.fn().mockReturnValue({ remove: jest.fn() }),
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

  it("configures Experiences as an explicit opt-in native feature", async () => {
    await WtsSdk.configure("public-app-key", {
      experiences: {
        enabled: true,
        renderMode: "automatic",
        allowedInternalRoutes: ["/checkout"],
        manifestVerificationKeys: { "experience-key-2026-07": "base64-spki-der" },
      },
    });

    expect(nativeModule.configure).toHaveBeenCalledWith(
      "public-app-key",
      null,
      null,
      expect.objectContaining({
        enabled: true,
        renderMode: "automatic",
        allowedInternalRoutes: ["/checkout"],
        manifestVerificationKeys: { "experience-key-2026-07": "base64-spki-der" },
      }),
    );
  });

  it("forwards typed screen context to the native Mobile Protocol V3 core", async () => {
    await WtsSdk.screen("checkout", { cart_total: 749.9, item_count: 3 });

    expect(nativeModule.screen).toHaveBeenCalledWith("checkout", {
      cart_total: 749.9,
      item_count: 3,
    });
  });

  it("delivers an opaque manual Experience handle without triggering native automatic presentation", async () => {
    const available = jest.fn();
    const action = jest.fn();

    await WtsSdk.configure("public-app-key", {
      experiences: { enabled: true, renderMode: "manual" },
    });
    WtsSdk.onExperienceAvailable(available);
    WtsSdk.onExperienceAction(action);

    const forwardedAvailable = nativeModule.onExperienceAvailable.mock.calls[0][0];
    forwardedAvailable({
      experience: { campaignId: "campaign_checkout", exposureId: "exposure-1" },
      handle: { exposureId: "exposure-1" },
    });

    const presentation = available.mock.calls[0][0];
    expect(presentation).toMatchObject({
      experience: { campaignId: "campaign_checkout" },
    });
    expect(presentation.experience).not.toHaveProperty("exposureId");
    expect(presentation.handle).not.toHaveProperty("exposureId");
    expect(Object.keys(presentation.handle)).toEqual([]);
    expect(nativeModule.presentNextExperience).not.toHaveBeenCalled();
    expect(nativeModule.dismissCurrentExperience).not.toHaveBeenCalled();
    expect(nativeModule.onExperienceAction).toHaveBeenCalledWith(action);
  });

  it("forwards the manual Experience lifecycle with the SDK-issued handle", async () => {
    const available = jest.fn();
    WtsSdk.onExperienceAvailable(available);
    const forwardedAvailable = nativeModule.onExperienceAvailable.mock.calls[0][0];
    forwardedAvailable({
      experience: { campaignId: "campaign_checkout", exposureId: "exposure-1" },
      handle: { exposureId: "exposure-1" },
    });
    const handle = available.mock.calls[0][0].handle;

    await expect(WtsSdk.acknowledgeExperienceRender(handle)).resolves.toEqual({
      accepted: true,
      idempotent: false,
    });
    await expect(WtsSdk.acknowledgeExperienceImpression(handle)).resolves.toEqual({
      accepted: true,
      idempotent: true,
    });
    await expect(WtsSdk.reportExperienceAction(handle, "primary-cta")).resolves.toEqual({
      accepted: true,
      idempotent: false,
    });
    await expect(
      WtsSdk.dismissExperience(handle, {
        reason: "renderFailed",
        failureCode: "RENDER_EXCEPTION",
      }),
    ).resolves.toEqual({
      accepted: false,
      idempotent: false,
      code: "RENDER_FAILED",
    });

    expect(nativeModule.acknowledgeExperienceRender).toHaveBeenCalledWith("exposure-1");
    expect(nativeModule.acknowledgeExperienceImpression).toHaveBeenCalledWith("exposure-1");
    expect(nativeModule.reportExperienceAction).toHaveBeenCalledWith("exposure-1", "primary-cta");
    expect(nativeModule.dismissExperience).toHaveBeenCalledWith(
      "exposure-1",
      "renderFailed",
      "RENDER_EXCEPTION",
    );
    expect(nativeModule.reportTestSessionExperienceInteraction).not.toHaveBeenCalled();
  });

  it("rejects a forged manual Experience handle before native forwarding", () => {
    expect(() =>
      WtsSdk.acknowledgeExperienceRender({} as never),
    ).toThrow("Experience presentation handles must be issued by this SDK instance.");
    expect(nativeModule.acknowledgeExperienceRender).not.toHaveBeenCalled();
  });

  it("exposes the PII-free native test device token in diagnostics", async () => {
    await expect(WtsSdk.getExperienceDiagnostics()).resolves.toMatchObject({
      testDeviceToken: "test-device-token",
    });
  });

  it("forwards a canonical pairing URL unchanged after trimming", async () => {
    const canonicalPairing =
      "https://notiword.wts.is/_wts/test/pair?pairing=pairing-token";

    const result = await WtsSdk.joinTestSession(`  ${canonicalPairing}  `);

    expect(nativeModule.joinTestSession).toHaveBeenCalledWith(canonicalPairing);
    expect(result).toMatchObject({
      accepted: true,
      joined: true,
      compatible: true,
      sessionId: "test-session-id",
      checks: [{ key: "sdk_version", status: "passed" }],
    });
  });

  it("forwards diagnostics without reinterpreting native test-session state", async () => {
    await expect(WtsSdk.getTestSessionDiagnostics()).resolves.toMatchObject({
      joined: true,
      compatible: true,
      pendingSignals: 2,
      sessionId: "test-session-id",
      expiresAt: "2026-07-18T12:00:00.000Z",
      lastErrorCode: "TEST_SESSION_RETRYING",
    });
    expect(nativeModule.getTestSessionDiagnostics).toHaveBeenCalledTimes(1);
  });

  it("forwards a test URL probe and decodes only its typed link payload", async () => {
    const url = "https://notiword.wts.is/checkout?ignored=true";

    await expect(WtsSdk.probeTestSessionUrl(url)).resolves.toEqual({
      match: true,
      status: "active",
      code: "OK",
      originalUrl: url,
      fallbackUrl: "https://personaleak.com/checkout",
      link: {
        id: "link_checkout",
        path: "/checkout",
        parameters: { coupon: "summer", member: true, sourceId: 42 },
      },
    });
    expect(nativeModule.probeTestSessionUrl).toHaveBeenCalledWith(url);
  });

  it("exposes the isolated test decision and reports only explicit test interactions", async () => {
    const result = await WtsSdk.runTestSessionProbes();

    expect(result).toEqual({
      accepted: true,
      emitted: ["identity_recorded", "event_recorded"],
      skipped: [],
      pendingSignals: 0,
      experienceDecision: {
        outcome: "ready",
        testGrant: { grant: "test-grant" },
        decision: { campaignId: "campaign_checkout" },
      },
    });
    expect(result).not.toHaveProperty("experienceDecisionJson");

    await WtsSdk.reportTestSessionExperienceInteraction("impression");
    expect(nativeModule.reportTestSessionExperienceInteraction).toHaveBeenCalledWith(
      "impression",
    );
  });

  it("does not mirror normal Experience controls into the test-session channel", async () => {
    await WtsSdk.presentNextExperience();
    await WtsSdk.dismissCurrentExperience();

    expect(nativeModule.reportTestSessionExperienceInteraction).not.toHaveBeenCalled();
  });

  it("rejects unsupported test Experience interactions before native forwarding", () => {
    expect(() =>
      WtsSdk.reportTestSessionExperienceInteraction("dismiss" as never),
    ).toThrow("Test Experience interactions must be impression or action.");
    expect(nativeModule.reportTestSessionExperienceInteraction).not.toHaveBeenCalled();
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
