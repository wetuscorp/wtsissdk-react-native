# @wetus/wts-sdk-react-native

Official React Native New Architecture wrapper for the wts.is native SDKs. A TypeScript TurboModule spec is implemented by Codegen-backed Swift/ObjC++ and Kotlin modules; the JavaScript layer does not duplicate networking or attribution logic.

> `0.1.0-alpha.1` · protocol V1 · React Native 0.85/0.86 · New Architecture only

## Install

```bash
npm install @wetus/wts-sdk-react-native@0.1.0-alpha.1
cd ios && bundle exec pod install
```

## Configure and handle links

```tsx
import { Linking } from 'react-native';
import { WtsSdk } from '@wetus/wts-sdk-react-native';

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
const deferred = await WtsSdk.getDeferredDeepLink(); // Android only in V1

await WtsSdk.track(
  'purchase_completed',
  { plan: 'pro', trial: false },
  { amount: '49.90', currency: 'TRY' },
);
await WtsSdk.flush(); // optional
```

Event scalar types and decimal revenue strings cross the bridge without coercion. iOS deferred resolution returns `null`. The SDK contains no legacy bridge, IDFA/GAID access, pasteboard attribution, fingerprinting, or automatic navigation.

See the `example`, [security policy](SECURITY.md), and [support policy](SUPPORT.md). Full documentation: https://wts.is/docs/sdk/react-native
