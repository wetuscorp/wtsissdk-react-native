import NativeWtsSdk, {
  type DeepLinkResult,
  type ExperienceActionEvent,
  type ExperienceActionResult,
  type ExperienceDiagnosticsResult,
  type ExperienceResult,
  type ExperienceTranslationResult,
  type TestSessionCheckResult,
  type TestSessionDiagnosticsResult,
  type TestSessionJoinResult,
  type TestSessionProbeResult,
  type TestSessionProbeRunResult,
} from "./NativeWtsSdk";

export type {
  DeepLinkResult,
  ExperienceActionEvent,
  ExperienceActionResult,
  ExperienceResult,
  ExperienceTranslationResult,
  TestSessionCheckResult,
};

export type WtsScalar = string | number | boolean;
export type WtsRevenue = { amount: string; currency: string };
export type WtsConsentState = "pending" | "granted" | "denied";
export type WtsUserValue = WtsScalar | string[] | Date;
export type WtsUserUpdate = {
  set?: Record<string, WtsUserValue>;
  setOnce?: Record<string, WtsUserValue>;
  unset?: string[];
  increment?: Record<string, number>;
};
export type WtsReportedAttribution = {
  source: string;
  medium?: string;
  campaign?: string;
  externalRef?: string;
};
export type WtsConfigureOptions = {
  apiBaseUrl?: string;
  collectorBaseUrl?: string;
};
export type WtsExperienceDiagnostics = Omit<ExperienceDiagnosticsResult, "consent"> & {
  consent: WtsConsentState;
};
export type WtsExperienceActionHandler = (
  experience: ExperienceResult,
  action: ExperienceActionResult,
) => boolean | Promise<boolean>;
export type WtsSubscription = { remove(): void };
export type WtsTestSessionJoin = TestSessionJoinResult;
export type WtsTestSessionDiagnostics = TestSessionDiagnosticsResult;
export type WtsTestSessionProbeLink = {
  id: string;
  path: string;
  parameters: Record<string, unknown>;
};
export type WtsTestSessionProbe = Omit<TestSessionProbeResult, "link"> & {
  link?: WtsTestSessionProbeLink;
};
export type WtsTestSessionExperienceDecision = {
  outcome: string;
  reason?: string;
  testGrant?: Record<string, unknown>;
  decision?: Record<string, unknown>;
};
export type WtsTestSessionProbeRun = Omit<
  TestSessionProbeRunResult,
  "experienceDecisionJson"
> & {
  experienceDecision?: WtsTestSessionExperienceDecision;
};

export class WtsSdkError extends Error {
  readonly code: string;
  readonly fallbackUrl?: string;

  constructor(code: string, message: string, fallbackUrl?: string) {
    super(message);
    this.name = "WtsSdkError";
    this.code = code;
    this.fallbackUrl = fallbackUrl;
  }
}

function wrapNativePromise<T>(promise: Promise<T>, fallbackUrl?: string): Promise<T> {
  return promise.catch((error: unknown) => {
    if (error instanceof WtsSdkError) throw error;
    const native = error as { code?: string; message?: string };
    throw new WtsSdkError(
      native.code ?? "NATIVE_ERROR",
      native.message ?? "Native SDK error.",
      fallbackUrl,
    );
  });
}

function validateEventProperties(properties: Record<string, WtsScalar>) {
  if (Object.keys(properties).length > 20) {
    throw new TypeError("Events support at most 20 properties.");
  }
  for (const value of Object.values(properties)) {
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new TypeError("Event properties must be string, number, or boolean.");
    }
    if (typeof value === "string" && value.length > 512) {
      throw new TypeError("String event properties cannot exceed 512 characters.");
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Number event properties must be finite.");
    }
  }
}

function validateEvent(
  eventKey: string,
  properties: Record<string, WtsScalar>,
  revenue?: WtsRevenue,
) {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(eventKey)) {
    throw new TypeError("eventKey must use lowercase snake_case.");
  }
  validateEventProperties(properties);
  if (revenue) {
    if (!/^-?\d{1,12}(?:\.\d{1,6})?$/.test(revenue.amount)) {
      throw new TypeError("Revenue amount must be a decimal string.");
    }
    if (!/^[A-Za-z]{3}$/.test(revenue.currency)) {
      throw new TypeError("Revenue currency must be an ISO-4217 code.");
    }
  }
}

function normalizeAttributes(
  attributes: Record<string, WtsUserValue>,
): Record<string, { kind: string; value: WtsScalar | string[] }> {
  if (Object.keys(attributes).length > 50) {
    throw new TypeError("A profile mutation supports at most 50 attributes.");
  }
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
        throw new TypeError("Attribute keys must use lowercase snake_case.");
      }
      if (value instanceof Date) return [key, { kind: "date", value: value.toISOString() }];
      if (Array.isArray(value)) {
        if (value.length > 50 || value.some((item) => item.length > 512)) {
          throw new TypeError("String-array attributes support 50 values of at most 512 characters.");
        }
        return [key, { kind: "string_array", value }];
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new TypeError("Number user attributes must be finite.");
      }
      if (typeof value === "string" && value.length > 2_048) {
        throw new TypeError("String user attributes cannot exceed 2048 characters.");
      }
      return [key, { kind: typeof value, value }];
    }),
  );
}

function validateUserUpdate(update: WtsUserUpdate) {
  const set = normalizeAttributes(update.set ?? {});
  const setOnce = normalizeAttributes(update.setOnce ?? {});
  const unset = update.unset ?? [];
  const increment = update.increment ?? {};
  const keys = [...Object.keys(set), ...Object.keys(setOnce), ...unset, ...Object.keys(increment)];
  if (keys.length === 0 || keys.length > 50 || new Set(keys).size !== keys.length) {
    throw new TypeError("Profile updates require 1 to 50 unique attribute operations.");
  }
  for (const key of [...unset, ...Object.keys(increment)]) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) {
      throw new TypeError("Attribute keys must use lowercase snake_case.");
    }
  }
  if (Object.values(increment).some((value) => !Number.isFinite(value))) {
    throw new TypeError("Increment values must be finite.");
  }
  return { set, setOnce, unset, increment };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function optionalJsonObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

const experienceActionHandlers = new Set<WtsExperienceActionHandler>();
let experienceActionBridgeConfigured = false;

function ensureExperienceActionBridge() {
  if (experienceActionBridgeConfigured) return;
  experienceActionBridgeConfigured = true;
  NativeWtsSdk.onExperienceAction(async ({ requestId, experience, action }) => {
    let handled = false;
    for (const handler of [...experienceActionHandlers]) {
      try {
        if (await handler(experience, action)) {
          handled = true;
          break;
        }
      } catch {
        // A throwing host handler is unhandled by contract.
      }
    }
    await NativeWtsSdk.completeExperienceAction(requestId, handled).catch(() => undefined);
  });
}

export const WtsSdk = {
  configure(appKey: string, options: WtsConfigureOptions = {}) {
    if (appKey.trim().length < 8) throw new TypeError("The wts.is app key is invalid.");
    ensureExperienceActionBridge();
    return wrapNativePromise(
      NativeWtsSdk.configure(
        appKey.trim(),
        options.apiBaseUrl ?? null,
        options.collectorBaseUrl ?? null,
      ),
    );
  },
  handle(url: string) {
    return wrapNativePromise(NativeWtsSdk.handle(url), url);
  },
  getDeferredDeepLink() {
    return wrapNativePromise(NativeWtsSdk.getDeferredDeepLink());
  },
  setConsent(consent: WtsConsentState) {
    if (consent === "pending") {
      throw new TypeError("setConsent accepts only granted or denied.");
    }
    return wrapNativePromise(NativeWtsSdk.setConsent(consent));
  },
  async getConsentState(): Promise<WtsConsentState> {
    const state = await wrapNativePromise(NativeWtsSdk.getConsentState());
    if (state !== "pending" && state !== "granted" && state !== "denied") {
      throw new WtsSdkError("INVALID_RESPONSE", "Native SDK returned an invalid consent state.");
    }
    return state;
  },
  identify(externalUserId: string, attributes: Record<string, WtsUserValue> = {}) {
    if (externalUserId.length < 1 || externalUserId.length > 128) {
      throw new TypeError("externalUserId must contain 1 to 128 characters.");
    }
    return wrapNativePromise(NativeWtsSdk.identify(externalUserId, normalizeAttributes(attributes)));
  },
  updateUser(update: WtsUserUpdate) {
    const value = validateUserUpdate(update);
    return wrapNativePromise(
      NativeWtsSdk.updateUser(value.set, value.setOnce, value.unset, value.increment),
    );
  },
  setReportedAttribution(attribution: WtsReportedAttribution) {
    const source = attribution.source.trim();
    if (!source || source.length > 120) {
      throw new TypeError("Attribution source must contain 1 to 120 characters.");
    }
    return wrapNativePromise(
      NativeWtsSdk.setReportedAttribution(
        source,
        attribution.medium ?? null,
        attribution.campaign ?? null,
        attribution.externalRef ?? null,
      ),
    );
  },
  resetIdentity() {
    return wrapNativePromise(NativeWtsSdk.resetIdentity());
  },
  track(
    eventKey: string,
    properties: Record<string, WtsScalar> = {},
    revenue?: WtsRevenue,
    linkId?: string,
  ) {
    validateEvent(eventKey, properties, revenue);
    return wrapNativePromise(
      NativeWtsSdk.track(
        eventKey,
        properties,
        revenue?.amount ?? null,
        revenue?.currency.toUpperCase() ?? null,
        linkId ?? null,
      ),
    );
  },
  screen(name: string, properties: Record<string, WtsScalar> = {}) {
    const normalized = name.trim();
    if (!normalized || normalized.length > 120) {
      throw new TypeError("Screen name must contain 1 to 120 characters.");
    }
    validateEventProperties(properties);
    return wrapNativePromise(NativeWtsSdk.screen(normalized, properties));
  },
  dismissCurrentExperience() {
    return wrapNativePromise(NativeWtsSdk.dismissCurrentExperience());
  },
  async getExperienceDiagnostics(): Promise<WtsExperienceDiagnostics> {
    const value = await wrapNativePromise(NativeWtsSdk.getExperienceDiagnostics());
    return { ...value, consent: value.consent as WtsConsentState };
  },
  onExperienceAction(handler: WtsExperienceActionHandler): WtsSubscription {
    ensureExperienceActionBridge();
    experienceActionHandlers.add(handler);
    return { remove: () => experienceActionHandlers.delete(handler) };
  },
  joinTestSession(pairing: string) {
    const normalized = pairing.trim();
    if (!normalized) throw new TypeError("A pairing URL, token, or code is required.");
    return wrapNativePromise(NativeWtsSdk.joinTestSession(normalized));
  },
  leaveTestSession() {
    return wrapNativePromise(NativeWtsSdk.leaveTestSession());
  },
  getTestSessionDiagnostics() {
    return wrapNativePromise(NativeWtsSdk.getTestSessionDiagnostics());
  },
  async probeTestSessionUrl(url: string): Promise<WtsTestSessionProbe> {
    const result = await wrapNativePromise(NativeWtsSdk.probeTestSessionUrl(url), url);
    return {
      ...result,
      link: result.link
        ? {
            id: result.link.id,
            path: result.link.path,
            parameters: parseJsonObject(result.link.parametersJson),
          }
        : undefined,
    };
  },
  async runTestSessionProbes(): Promise<WtsTestSessionProbeRun> {
    const result = await wrapNativePromise(NativeWtsSdk.runTestSessionProbes());
    const payload = result.experienceDecisionJson
      ? parseJsonObject(result.experienceDecisionJson)
      : undefined;
    return {
      accepted: result.accepted,
      emitted: result.emitted,
      skipped: result.skipped,
      pendingSignals: result.pendingSignals,
      experienceDecision: payload
        ? {
            outcome: typeof payload.outcome === "string" ? payload.outcome : "unavailable",
            reason: typeof payload.reason === "string" ? payload.reason : undefined,
            testGrant: optionalJsonObject(payload.testGrant),
            decision: optionalJsonObject(payload.decision),
          }
        : undefined,
    };
  },
  flush() {
    return wrapNativePromise(NativeWtsSdk.flush());
  },
};
