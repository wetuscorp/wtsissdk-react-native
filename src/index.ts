import NativeWtsSdk, { type DeepLinkResult } from "./NativeWtsSdk";

export type { DeepLinkResult };
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

export const WtsSdk = {
  configure(appKey: string, apiBaseUrl?: string) {
    if (appKey.trim().length < 8) throw new TypeError("The wts.is app key is invalid.");
    return wrapNativePromise(NativeWtsSdk.configure(appKey.trim(), apiBaseUrl ?? null));
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
  flush() {
    return wrapNativePromise(NativeWtsSdk.flush());
  },
};
