let experienceActionListener:
  | ((event: {
      requestId: string;
      experience: Record<string, unknown>;
      action: Record<string, unknown>;
    }) => Promise<void>)
  | undefined;

const nativeModule = {
  configure: jest.fn().mockResolvedValue(undefined),
  handle: jest.fn().mockResolvedValue({
    path: "/checkout",
    parameters: {},
    isDeferred: false,
  }),
  getDeferredDeepLink: jest.fn().mockResolvedValue(null),
  setConsent: jest.fn().mockResolvedValue(undefined),
  getConsentState: jest.fn().mockResolvedValue("pending"),
  identify: jest.fn().mockResolvedValue(undefined),
  updateUser: jest.fn().mockResolvedValue(undefined),
  setReportedAttribution: jest.fn().mockResolvedValue(undefined),
  resetIdentity: jest.fn().mockResolvedValue(undefined),
  track: jest.fn().mockResolvedValue(undefined),
  screen: jest.fn().mockResolvedValue(undefined),
  dismissCurrentExperience: jest.fn().mockResolvedValue(false),
  getExperienceDiagnostics: jest.fn().mockResolvedValue({
    enabled: false,
    consent: "pending",
    queued: 0,
    presenting: false,
    testDeviceToken: "test-device-token",
  }),
  completeExperienceAction: jest.fn().mockResolvedValue(undefined),
  joinTestSession: jest.fn().mockResolvedValue({
    accepted: true,
    joined: true,
    compatible: true,
    checks: [],
  }),
  leaveTestSession: jest.fn().mockResolvedValue(true),
  getTestSessionDiagnostics: jest.fn().mockResolvedValue({
    joined: true,
    compatible: true,
    checks: [],
    pendingSignals: 0,
  }),
  probeTestSessionUrl: jest.fn().mockResolvedValue({
    match: true,
    status: "active",
    code: "OK",
    originalUrl: "https://demo.wts.is/checkout",
    fallbackUrl: "https://demo.wts.is/checkout",
    link: {
      id: "link-checkout",
      path: "/checkout",
      parametersJson: '{"coupon":"summer"}',
    },
  }),
  runTestSessionProbes: jest.fn().mockResolvedValue({
    accepted: true,
    emitted: ["experiences"],
    skipped: [],
    pendingSignals: 0,
    experienceDecisionJson:
      '{"outcome":"ready","decision":{"campaignId":"campaign-checkout"}}',
  }),
  onExperienceAction: jest.fn((listener: typeof experienceActionListener) => {
    experienceActionListener = listener;
    return { remove: jest.fn() };
  }),
  flush: jest.fn().mockResolvedValue(undefined),
};

jest.mock("react-native", () => ({
  TurboModuleRegistry: { getEnforcing: () => nativeModule },
}));

import { WtsSdk } from "../src";

const experience = {
  campaignId: "campaign-checkout",
  campaignVersionId: "version-1",
  assignmentId: "assignment-1",
  variantId: "variant-a",
  placement: "modal",
  priority: 10,
  translations: [],
  closeable: true,
  themePreset: "default",
  delaySeconds: 0,
};

describe("WtsSdk", () => {
  beforeEach(() => jest.clearAllMocks());

  it("configures only the app/source key and transport overrides", async () => {
    await WtsSdk.configure("public-app-key", {
      apiBaseUrl: "https://api.example.test/api/v1",
      collectorBaseUrl: "https://collect.example.test",
    });

    expect(nativeModule.configure).toHaveBeenCalledWith(
      "public-app-key",
      "https://api.example.test/api/v1",
      "https://collect.example.test",
    );
    expect(nativeModule.onExperienceAction).toHaveBeenCalledTimes(1);
  });

  it("uses unified consent and rejects pending as a decision", async () => {
    expect(() => WtsSdk.setConsent("pending")).toThrow(TypeError);

    await WtsSdk.setConsent("granted");
    nativeModule.getConsentState.mockResolvedValueOnce("granted");

    expect(nativeModule.setConsent).toHaveBeenCalledWith("granted");
    await expect(WtsSdk.getConsentState()).resolves.toBe("granted");
  });

  it("keeps functional deep-link identifiers optional", async () => {
    await expect(WtsSdk.handle("https://demo.wts.is/checkout")).resolves.toEqual({
      path: "/checkout",
      parameters: {},
      isDeferred: false,
    });
  });

  it("normalizes revenue and preserves the existing event trigger API", async () => {
    await WtsSdk.track(
      "purchase_completed",
      { plan: "pro" },
      { amount: "49.90", currency: "try" },
    );

    expect(nativeModule.track).toHaveBeenCalledWith(
      "purchase_completed",
      { plan: "pro" },
      "49.90",
      "TRY",
      null,
    );
  });

  it("acknowledges handled advanced actions through the internal bridge", async () => {
    await WtsSdk.configure("public-app-key");
    const subscription = WtsSdk.onExperienceAction((_experience, action) =>
      Promise.resolve(action.type === "OPEN_INTERNAL_ROUTE"),
    );

    await experienceActionListener?.({
      requestId: "request-1",
      experience,
      action: {
        id: "open-checkout",
        label: "Continue",
        type: "OPEN_INTERNAL_ROUTE",
        target: "/checkout",
      },
    });

    expect(nativeModule.completeExperienceAction).toHaveBeenCalledWith("request-1", true);
    subscription.remove();
  });

  it("reports missing and failing advanced handlers as unhandled", async () => {
    await WtsSdk.configure("public-app-key");
    const subscription = WtsSdk.onExperienceAction(() => {
      throw new Error("host callback failed");
    });

    await experienceActionListener?.({
      requestId: "request-2",
      experience,
      action: { id: "custom", label: "Run", type: "CUSTOM_CALLBACK" },
    });
    subscription.remove();
    await experienceActionListener?.({
      requestId: "request-3",
      experience,
      action: { id: "custom", label: "Run", type: "CUSTOM_CALLBACK" },
    });

    expect(nativeModule.completeExperienceAction).toHaveBeenNthCalledWith(1, "request-2", false);
    expect(nativeModule.completeExperienceAction).toHaveBeenNthCalledWith(2, "request-3", false);
  });

  it("keeps test Experience decisions isolated in native Test Session V2", async () => {
    const result = await WtsSdk.runTestSessionProbes();

    expect(result.experienceDecision?.outcome).toBe("ready");
    expect(result.experienceDecision?.decision).toEqual({
      campaignId: "campaign-checkout",
    });
  });

  it("wraps native failures with the original URL fallback", async () => {
    nativeModule.handle.mockRejectedValueOnce({ code: "TIMEOUT", message: "timed out" });

    await expect(WtsSdk.handle("https://demo.wts.is/checkout")).rejects.toEqual(
      expect.objectContaining({
        code: "TIMEOUT",
        fallbackUrl: "https://demo.wts.is/checkout",
      }),
    );
  });
});
