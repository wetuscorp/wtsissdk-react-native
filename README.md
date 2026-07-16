# @wetusco/wts-sdk

Official React Native New Architecture wrapper for the wts.is native SDKs. A TypeScript TurboModule spec is implemented by Codegen-backed Swift/ObjC++ and Kotlin modules; the JavaScript layer does not duplicate networking or attribution logic.

> `0.2.0-alpha.1` · Mobile Protocol V2 + Identity V1 · React Native 0.85/0.86 · New Architecture only

## Install

```bash
npm install @wetusco/wts-sdk@0.2.0-alpha.1
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
