import NativeWtsSdk, { type DeepLinkResult } from "./NativeWtsSdk";

export type { DeepLinkResult };
export type WtsScalar = string | number | boolean;
export type WtsRevenue = { amount: string; currency: string };

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

export const WtsSdk = {
  configure(appKey: string, apiBaseUrl?: string) {
    if (appKey.trim().length < 8) throw new TypeError("The wts.is app key is invalid.");
    return NativeWtsSdk.configure(appKey.trim(), apiBaseUrl ?? null);
  },
  async handle(url: string) {
    try {
      return await NativeWtsSdk.handle(url);
    } catch (error) {
      const native = error as { code?: string; message?: string };
      throw new WtsSdkError(native.code ?? "wts_sdk", native.message ?? "Native SDK error.", url);
    }
  },
  getDeferredDeepLink() {
    return NativeWtsSdk.getDeferredDeepLink();
  },
  track(
    eventKey: string,
    properties: Record<string, WtsScalar> = {},
    revenue?: WtsRevenue,
    linkId?: string,
  ) {
    validateEvent(eventKey, properties, revenue);
    return NativeWtsSdk.track(
      eventKey,
      properties,
      revenue?.amount ?? null,
      revenue?.currency.toUpperCase() ?? null,
      linkId ?? null,
    );
  },
  flush() {
    return NativeWtsSdk.flush();
  },
};
