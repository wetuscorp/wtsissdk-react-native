# Changelog

## 0.4.0-alpha.1

- Pins Android `co.wetus:wts-sdk:0.4.0-alpha.1` and iOS `WtsSDK
  0.4.0-alpha.1` exactly; keep the React Native wrapper and both native cores
  on this matching version.
- Added verified Experiences manifest delivery: the wrapper supplies a pinned
  Ed25519 public-key ring to the native cores, which verify the signed payload
  before parsing it. Unverified outer manifest content is not used.
- Replaced the ambiguous manual-presentation callback with an opaque
  presentation handle and explicit render, impression, action, and dismissal
  lifecycle acknowledgements.
- Removed delivery correlation identifiers from public Experience payloads;
  manual lifecycle correlation remains internal to the opaque handle.
- Preserved SDK Test Session V1 pairing, probes, diagnostics, and isolated
  test-only Experience reporting.

## 0.3.0-alpha.1

- Wrapped Mobile Protocol V3 built-in screen tracking.
- Added explicitly opt-in contextual and personalized wts.is Experiences.
- Added native automatic/manual presentation and diagnostics through TurboModules.
- Kept protocol, persistence, safe actions and impression measurement in the Swift/Kotlin cores.
- Added SDK Test Session V1 pairing, diagnostics, isolated probes, and explicit
  test-only Experience impression/action reporting through the TurboModule.

## 0.2.0-alpha.1

- Upgraded the native wrappers to Mobile Protocol V2 and Identity V1.
- Added consent-gated `identify`, `updateUser`, `setReportedAttribution`, and `resetIdentity` APIs.
- Preserved scalar, date, array, and decimal values across the New Architecture bridge.
- Kept identity storage, ordering, retry, and networking in the Swift and Kotlin cores.
- Preserved opaque external user IDs without trimming or normalization.
- Normalized native failures into stable cross-platform `WtsSdkError` codes.

## 0.1.0-alpha.1

- Initial public alpha for React Native 0.85/0.86 New Architecture, backed by Codegen TurboModules and the official native SDKs.
