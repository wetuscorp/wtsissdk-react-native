import type { CodegenTypes, TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type DeepLinkResult = {
  path: string;
  parameters: Object;
  linkId: string;
  attributionId: string;
  isDeferred: boolean;
};

export type ExperienceDiagnosticsResult = {
  enabled: boolean;
  consent: string;
  queued: number;
  presenting: boolean;
  testDeviceToken: string;
  lastErrorCode?: string;
};

export type ExperienceActionResult = {
  id: string;
  label: string;
  type: string;
  target?: string;
};

export type ExperienceTranslationResult = {
  locale: string;
  title: string;
  description: string;
  primaryAction?: ExperienceActionResult;
  secondaryAction?: ExperienceActionResult;
};

export type ExperienceResult = {
  campaignId: string;
  campaignVersionId: string;
  assignmentId: string;
  variantId: string;
  exposureId: string;
  placement: string;
  priority: number;
  translations: ReadonlyArray<ExperienceTranslationResult>;
  closeable: boolean;
  themePreset: string;
  delaySeconds: number;
  autoCloseSeconds?: number;
  assetUrl?: string;
};

export type ExperienceActionEvent = {
  experience: ExperienceResult;
  action: ExperienceActionResult;
};

export interface Spec extends TurboModule {
  readonly onExperienceAvailable: CodegenTypes.EventEmitter<ExperienceResult>;
  readonly onExperienceAction: CodegenTypes.EventEmitter<ExperienceActionEvent>;
  configure(
    appKey: string,
    apiBaseUrl: string | null,
    collectorBaseUrl: string | null,
    experienceOptions: Object,
  ): Promise<void>;
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
  screen(name: string, properties: Object): Promise<void>;
  setExperienceConsent(consent: string): Promise<string>;
  presentNextExperience(): Promise<boolean>;
  dismissCurrentExperience(): Promise<boolean>;
  getExperienceDiagnostics(): Promise<ExperienceDiagnosticsResult>;
  flush(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("WtsSdk");
