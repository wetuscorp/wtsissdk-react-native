# @wetusco/wts-sdk

Official React Native New Architecture wrapper for the wts.is native SDKs. A TypeScript TurboModule spec is implemented by Codegen-backed Swift/ObjC++ and Kotlin modules; the JavaScript layer does not duplicate networking or attribution logic.

> `0.4.0-alpha.1` release line · Mobile Protocol V3 + Identity V1 + Experiences V1 + SDK Test Session V1 · React Native 0.85/0.86 · New Architecture only

> **Release compatibility:** SDK Test & Validate and Experiences require the
> matching `0.4.0-alpha.1` React Native package and matching published
> Swift/Android core releases. The wrapper pins those native dependencies
> exactly, so publish the native cores before this package.

## Install

```bash
npm install @wetusco/wts-sdk@<matching-published-version>
cd ios && bundle exec pod install
```

## Configure and handle links

```tsx
import { Linking } from 'react-native';
import { WtsSdk } from '@wetusco/wts-sdk';

await WtsSdk.configure('YOUR_PUBLIC_APP_KEY');

async function handle(url: string) {
  try {
    const link = await WtsSdk.handle(url);
    if (allowedRoutes.has(link.path)) navigation.navigate(routeFor(link.path), link.parameters);
  } catch {
    await Linking.openURL(url);
  }
}
```

Subscribe to React Native `Linking` initial URL and URL events. Configure Associated Domains on iOS and an auto-verified App Link intent filter on Android. The module never performs navigation.

## Deferred and events

```tsx
const deferred = await WtsSdk.getDeferredDeepLink(); // deterministic on Android

await WtsSdk.track(
  'purchase_completed',
  { plan: 'pro', trial: false },
  { amount: '49.90', currency: 'TRY' },
);
await WtsSdk.flush(); // optional
```

Event scalar types and decimal revenue strings cross the bridge without coercion. iOS deferred resolution returns `null`. The SDK contains no legacy bridge, IDFA/GAID access, pasteboard attribution, fingerprinting, or automatic navigation.

## Screens and Experiences

Screen views are built-in Mobile Protocol V3 events:

```tsx
await WtsSdk.screen('checkout', {
  cart_total: 749.90,
  currency: 'TRY',
  item_count: 3,
});
```

Experiences is disabled by default. Opt in during configuration and pass a
separate consent state:

```tsx
await WtsSdk.configure('YOUR_PUBLIC_APP_KEY', {
  experiences: {
    enabled: true,
    renderMode: 'automatic',
    allowedInternalRoutes: ['/checkout', '/account'],
    allowedCallbackKeys: ['apply_offer'],
    allowedDeepLinkHosts: ['go.example.com'],
    allowedDeepLinkSchemes: ['example'],
    allowedWebOrigins: ['https://www.example.com'],
    manifestVerificationKeys: {
      'experience-key-2026-07': 'BASE64_SPKI_DER_ED25519_PUBLIC_KEY',
    },
  },
});

await WtsSdk.setExperienceConsent('contextual');
```

Use `personalized` only after profile consent. `pending` performs no
Experience request and `denied` clears local state and queued interactions.
Native cores own rendering, persistent retry, safe actions and
visibility-qualified impressions. Retrieve the public key ring from the
authenticated workspace API,
`GET /api/v1/organizations/:organizationId/experiences/manifest-verification-keys`,
then pin the returned `kid` → base64 SPKI DER values in app configuration.
Never derive these values from, or include, server signing secrets in a client.
The native core ignores the unsigned outer manifest and verifies its signed
payload before it is parsed.

`automatic` keeps presentation inside the native core. In `manual` mode,
`onExperienceAvailable` receives typed renderable content and one opaque
SDK-issued handle only after a candidate is queued. Delivery identifiers never
enter the public manual payload. The host owns UI rendering and reports the
actual lifecycle:

```tsx
const subscription = WtsSdk.onExperienceAvailable(async ({ experience, handle }) => {
  const render = await WtsSdk.acknowledgeExperienceRender(handle);
  if (!render.accepted) return;

  const result = await showYourExperienceUi(experience);
  if (result.wasVisibleForOneSecond) {
    await WtsSdk.acknowledgeExperienceImpression(handle);
  }
  if (result.actionId) {
    await WtsSdk.reportExperienceAction(handle, result.actionId);
  } else {
    await WtsSdk.dismissExperience(handle);
  }
});
```

Call `failExperiencePresentation(handle, failureCode)` when the manual renderer
cannot show a candidate. Do not persist or reconstruct handles.
`presentNextExperience()` and `dismissCurrentExperience()` belong to automatic
rendering; manual mode never asks the native renderer to present or emits a
second availability callback. `onExperienceAction` remains available for safe
action callbacks without a legacy bridge.

For an unpublished device test, copy
`(await WtsSdk.getExperienceDiagnostics()).testDeviceToken` into the dashboard
test panel for the matching Mobile App. The random token contains no install,
user, or profile identifier, and test traffic is excluded from customer
analytics and usage.

## SDK Test & Validate

SDK Test & Validate is a dashboard-issued, short-lived validation session. Its
bounded retry queue is isolated from production analytics, identities,
attribution, and Experiences. Do not hardcode, log, or persist the pairing URL
or token outside the SDK.

The dashboard QR code uses this canonical form:

```text
https://<mobile-app-host>/_wts/test/pair?pairing=<dashboard-issued-token>
```

Detect that pairing route before normal React Native link handling. A pairing
URL must join the isolated session and must not be sent to `handle`.

```tsx
function isWtsTestPairing(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.pathname === '/_wts/test/pair';
  } catch {
    return false;
  }
}

async function onIncomingUrl(url: string) {
  if (isWtsTestPairing(url)) {
    const joined = await WtsSdk.joinTestSession(url);
    showSdkTestChecks(joined.checks);
    return;
  }

  // Normal production behavior stays unchanged.
  try {
    const link = await WtsSdk.handle(url);
    navigation.navigate(routeFor(link.path), link.parameters);
  } catch {
    await Linking.openURL(url);
  }
}
```

Use the dashboard-selected plan and isolated diagnostics without creating
normal analytics:

```tsx
const diagnostics = await WtsSdk.getTestSessionDiagnostics();
const probes = await WtsSdk.runTestSessionProbes();

// This is a test-only manual preview. It is not passed to the normal native
// Experiences renderer.
if (probes.experienceDecision?.outcome === 'ready') {
  await presentTestExperiencePreview(probes.experienceDecision);
  await WtsSdk.reportTestSessionExperienceInteraction('impression');
}
```

Call `reportTestSessionExperienceInteraction('action')` only after the
corresponding real action in that preview. It is accepted only after a ready
isolated decision; production Experience lifecycle signals are never mirrored
to the test session. Use `probeTestSessionUrl(url)` for an event-free resolver
check and `leaveTestSession()` when the operator finishes. Expiry also clears
the session.

## User identity and reported attribution

Profile operations require an explicit consent decision from the host application. Use your own stable, opaque customer ID rather than an email address as `externalUserId`; the value is case-sensitive and is not trimmed or normalized.

```tsx
await WtsSdk.setProfileConsent(true);

await WtsSdk.identify('customer_1842', {
  email: 'user@example.com',
  plan: 'enterprise',
  subscribed: true,
});

await WtsSdk.updateUser({
  set: { plan: 'business' },
  setOnce: { signup_channel: 'partner' },
  increment: { lifetime_orders: 1 },
});

await WtsSdk.setReportedAttribution({
  source: 'newsletter',
  medium: 'email',
  campaign: 'summer_2026',
  externalRef: 'mailing-482',
});
```

Call `resetIdentity()` on logout. It removes the current profile binding, rotates the anonymous/session context and preserves the native installation identity. Setting profile consent to `false` also queues a server-side binding reset while anonymous analytics remains available. Identity mutations are persisted by the native SDKs and flushed before events.

See the `example`, [security policy](SECURITY.md), and [support policy](SUPPORT.md). Full documentation: https://wts.is/en/resources/docs/sdk-react-native

Native failures reject with `WtsSdkError` and stable codes such as `TIMEOUT`,
`NO_MATCH`, and `PROFILE_CONSENT_REQUIRED`.
