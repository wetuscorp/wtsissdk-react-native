import type { CodegenTypes, TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type DeepLinkResult = {
  path: string;
  parameters: Object;
  linkId?: string;
  attributionId?: string;
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
  requestId: string;
  experience: ExperienceResult;
  action: ExperienceActionResult;
};

export type TestSessionCheckResult = {
  key: string;
  status: string;
  code?: string;
  message?: string;
};

export type TestSessionJoinResult = {
  accepted: boolean;
  joined: boolean;
  compatible: boolean;
  checks: ReadonlyArray<TestSessionCheckResult>;
  requiredSdkVersion?: string;
  sessionId?: string;
  expiresAt?: string;
  testProfileExternalUserId?: string;
  errorCode?: string;
};

export type TestSessionDiagnosticsResult = {
  joined: boolean;
  compatible: boolean;
  checks: ReadonlyArray<TestSessionCheckResult>;
  pendingSignals: number;
  sessionId?: string;
  expiresAt?: string;
  requiredSdkVersion?: string;
  lastErrorCode?: string;
};

export type TestSessionProbeLinkResult = {
  id: string;
  path: string;
  parametersJson: string;
};

export type TestSessionProbeResult = {
  match: boolean;
  status: string;
  code: string;
  originalUrl: string;
  fallbackUrl: string;
  link?: TestSessionProbeLinkResult;
};

export type TestSessionProbeRunResult = {
  accepted: boolean;
  emitted: ReadonlyArray<string>;
  skipped: ReadonlyArray<string>;
  pendingSignals: number;
  experienceDecisionJson?: string;
};

export interface Spec extends TurboModule {
  readonly onExperienceAction: CodegenTypes.EventEmitter<ExperienceActionEvent>;
  configure(
    appKey: string,
    apiBaseUrl: string | null,
    collectorBaseUrl: string | null,
  ): Promise<void>;
  handle(url: string): Promise<DeepLinkResult>;
  getDeferredDeepLink(): Promise<DeepLinkResult | null>;
  setConsent(consent: string): Promise<void>;
  getConsentState(): Promise<string>;
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
  dismissCurrentExperience(): Promise<boolean>;
  getExperienceDiagnostics(): Promise<ExperienceDiagnosticsResult>;
  completeExperienceAction(requestId: string, handled: boolean): Promise<void>;
  joinTestSession(pairing: string): Promise<TestSessionJoinResult>;
  leaveTestSession(): Promise<boolean>;
  getTestSessionDiagnostics(): Promise<TestSessionDiagnosticsResult>;
  probeTestSessionUrl(url: string): Promise<TestSessionProbeResult>;
  runTestSessionProbes(): Promise<TestSessionProbeRunResult>;
  flush(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("WtsSdk");
