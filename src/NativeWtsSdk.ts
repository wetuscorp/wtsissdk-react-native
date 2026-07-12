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
