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
export type WtsExperienceConsent = "pending" | "contextual" | "personalized" | "denied";
export type WtsExperienceRenderMode = "automatic" | "manual";
export type WtsExperienceOptions = {
  enabled?: boolean;
  renderMode?: WtsExperienceRenderMode;
  allowedInternalRoutes?: string[];
  allowedCallbackKeys?: string[];
  allowedDeepLinkHosts?: string[];
  allowedDeepLinkSchemes?: string[];
  allowedWebOrigins?: string[];
};
export type WtsConfigureOptions = {
  apiBaseUrl?: string;
  collectorBaseUrl?: string;
  experiences?: WtsExperienceOptions;
};
export type WtsExperienceDiagnostics = ExperienceDiagnosticsResult & {
  consent: WtsExperienceConsent;
};
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

function validateEvent(
  eventKey: string,
  properties: Record<string, WtsScalar>,
  revenue?: WtsRevenue,
) {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(eventKey)) {
    throw new TypeError("eventKey must use lowercase snake_case.");
  }
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
  }
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
      if (value instanceof Date) {
        return [key, { kind: "date", value: value.toISOString() }];
      }
      if (Array.isArray(value)) {
        if (value.length > 50 || value.some((item) => typeof item !== "string" || item.length > 512)) {
          throw new TypeError("String-array attributes support 50 values of at most 512 characters.");
        }
        return [key, { kind: "string_array", value }];
      }
      if (!["string", "number", "boolean"].includes(typeof value)) {
        throw new TypeError("User attributes must be string, number, boolean, Date, or string[].");
      }
      if (typeof value === "string" && value.length > 2_048) {
        throw new TypeError("String user attributes cannot exceed 2048 characters.");
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new TypeError("Number user attributes must be finite.");
      }
      return [
        key,
        {
          kind:
            typeof value === "string"
              ? "string"
              : typeof value === "number"
                ? "number"
                : "boolean",
          value,
        },
      ];
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

export const WtsSdk = {
  configure(appKey: string, options: WtsConfigureOptions = {}) {
    if (appKey.trim().length < 8) throw new TypeError("The wts.is app key is invalid.");
    const experiences = options.experiences ?? {};
    return wrapNativePromise(
      NativeWtsSdk.configure(
        appKey.trim(),
        options.apiBaseUrl ?? null,
        options.collectorBaseUrl ?? null,
        {
          enabled: experiences.enabled ?? false,
          renderMode: experiences.renderMode ?? "automatic",
          allowedInternalRoutes: experiences.allowedInternalRoutes ?? [],
          allowedCallbackKeys: experiences.allowedCallbackKeys ?? [],
          allowedDeepLinkHosts: experiences.allowedDeepLinkHosts ?? [],
          allowedDeepLinkSchemes: experiences.allowedDeepLinkSchemes ?? [],
          allowedWebOrigins: experiences.allowedWebOrigins ?? [],
        },
      ),
    );
  },
  handle(url: string) {
    return wrapNativePromise(NativeWtsSdk.handle(url), url);
  },
  getDeferredDeepLink() {
    return wrapNativePromise(NativeWtsSdk.getDeferredDeepLink());
  },
  setProfileConsent(granted: boolean) {
    return wrapNativePromise(NativeWtsSdk.setProfileConsent(granted));
  },
  identify(externalUserId: string, attributes: Record<string, WtsUserValue> = {}) {
    if (externalUserId.length < 1 || externalUserId.length > 128) {
      throw new TypeError("externalUserId must contain 1 to 128 characters.");
    }
    return wrapNativePromise(
      NativeWtsSdk.identify(externalUserId, normalizeAttributes(attributes)),
    );
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
  setExperienceConsent(consent: WtsExperienceConsent) {
    return wrapNativePromise(NativeWtsSdk.setExperienceConsent(consent));
  },
  presentNextExperience() {
    return wrapNativePromise(NativeWtsSdk.presentNextExperience());
  },
  dismissCurrentExperience() {
    return wrapNativePromise(NativeWtsSdk.dismissCurrentExperience());
  },
  getExperienceDiagnostics() {
    return wrapNativePromise(
      NativeWtsSdk.getExperienceDiagnostics() as Promise<WtsExperienceDiagnostics>,
    );
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
  reportTestSessionExperienceInteraction(interaction: "impression" | "action") {
    if (interaction !== "impression" && interaction !== "action") {
      throw new TypeError("Test Experience interactions must be impression or action.");
    }
    return wrapNativePromise(NativeWtsSdk.reportTestSessionExperienceInteraction(interaction));
  },
  onExperienceAvailable(handler: (experience: ExperienceResult) => void | Promise<void>) {
    return NativeWtsSdk.onExperienceAvailable(handler);
  },
  onExperienceAction(handler: (event: ExperienceActionEvent) => void | Promise<void>) {
    return NativeWtsSdk.onExperienceAction(handler);
  },
  flush() {
    return wrapNativePromise(NativeWtsSdk.flush());
  },
};

function validateEventProperties(properties: Record<string, WtsScalar>) {
  validateEvent("screen_view", properties);
}
