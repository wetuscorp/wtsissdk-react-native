import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type DeepLinkResult = {
  path: string;
  parameters: Object;
  linkId: string;
  attributionId: string;
  isDeferred: boolean;
};

export interface Spec extends TurboModule {
  configure(appKey: string, apiBaseUrl: string | null): Promise<void>;
  handle(url: string): Promise<DeepLinkResult>;
  getDeferredDeepLink(): Promise<DeepLinkResult | null>;
  setProfileConsent(granted: boolean): Promise<void>;
  identify(externalUserId: string, attributes: Object): Promise<void>;
  updateUser(
    set: Object,
    setOnce: Object,
    unset: ReadonlyArray<string>,
    increment: Object,
  ): Promise<void>;
  setReportedAttribution(
    source: string,
    medium: string | null,
    campaign: string | null,
    externalRef: string | null,
  ): Promise<void>;
  resetIdentity(): Promise<void>;
  track(
    eventKey: string,
    properties: Object,
    amount: string | null,
    currency: string | null,
    linkId: string | null,
  ): Promise<void>;
  flush(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("WtsSdk");
