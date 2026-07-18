# Changelog

> Entries for the `0.3.0-alpha.1` source line below are not an npm or native
> registry publication claim. SDK Test & Validate requires matching published
> React Native, Swift, and Android releases.

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
