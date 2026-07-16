# Changelog

## 0.2.0-alpha.1

- Upgraded the native wrappers to Mobile Protocol V2 and Identity V1.
- Added consent-gated `identify`, `updateUser`, `setReportedAttribution`, and `resetIdentity` APIs.
- Preserved scalar, date, array, and decimal values across the New Architecture bridge.
- Kept identity storage, ordering, retry, and networking in the Swift and Kotlin cores.
- Preserved opaque external user IDs without trimming or normalization.
- Normalized native failures into stable cross-platform `WtsSdkError` codes.

## 0.1.0-alpha.1

- Initial public alpha for React Native 0.85/0.86 New Architecture, backed by Codegen TurboModules and the official native SDKs.
