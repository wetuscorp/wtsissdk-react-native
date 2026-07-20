# @wetusco/wts-sdk

Official React Native New Architecture wrapper for wts.is. The wrapper pins the
Swift and Android cores exactly and keeps consent, persistence, signed
Experiences, attribution, and rendering in those native cores.

> `0.5.0-alpha.1` · Mobile Protocol V4 · Identity V1 · Experiences V2 · SDK Test Session V2 · React Native 0.85/0.86

## Install

```bash
npm install @wetusco/wts-sdk@0.5.0-alpha.1
cd ios && bundle exec pod install
```

The package pins both `co.wetus:wts-sdk` and `WtsSDK` to
`0.5.0-alpha.1`. Do not override either native dependency independently.

## One-time integration

```tsx
import { WtsSdk } from '@wetusco/wts-sdk';

await WtsSdk.configure('YOUR_PUBLIC_APP_KEY');

const current = await WtsSdk.getConsentState(); // pending | granted | denied
if (current === 'pending') {
  const accepted = await showYourConsentUi();
  await WtsSdk.setConsent(accepted ? 'granted' : 'denied');
}
```

Consent UI belongs to the host application. A granted or denied decision is
persisted for this app installation. Denial clears SDK-owned event, identity,
Experience, attribution, and test-session state and cancels active delivery.
Before grant, normal data storage and network delivery are disabled; direct
link handling may only use Mobile V4's data-minimized functional resolve.

The first 0.5 launch clears the old 0.4 namespace and begins at `pending`.
Neither old consent nor old test data is migrated.

## Events, screens, and identity

```tsx
await WtsSdk.track('purchase_completed', {
  plan: 'pro',
  trial: false,
}, {
  amount: '49.90',
  currency: 'TRY',
});

await WtsSdk.screen('checkout', {
  cart_total: 749.90,
  currency: 'TRY',
});

await WtsSdk.identify('customer_1842', {
  plan: 'enterprise',
});
```

The app continues sending its predefined events. Dashboard campaigns select
from that event catalog; creating, publishing, pausing, or revising a campaign
does not require adding campaign keys or redeploying the app.

`track` and `screen` return after the event is accepted by the local queue.
Signed Experience configuration is refreshed by the native core, and eligible
modal or bottom-sheet campaigns are queued by priority and rendered
automatically. There are no client allowlists, manifest verification keys,
Experience-specific enable flags, or manual presentation acknowledgements.

## Advanced Experience actions

Normal web and deep-link actions are handled by the native renderer. Register a
handler only for application-owned internal routes or custom callbacks:

```tsx
const subscription = WtsSdk.onExperienceAction(async (_experience, action) => {
  if (action.type === 'INTERNAL_ROUTE' && action.target === '/checkout') {
    navigation.navigate('Checkout');
    return true;
  }
  return false;
});

// Later:
subscription.remove();
```

Returning `false`, throwing, timing out, or having no handler records the action
as unhandled and leaves the Experience open. `dismissCurrentExperience()` is
retained as an emergency host control. `getExperienceDiagnostics()` exposes
non-sensitive delivery state.

## Deep links

```tsx
import { Linking } from 'react-native';

async function handle(url: string) {
  try {
    const link = await WtsSdk.handle(url);
    if (allowedRoutes.has(link.path)) {
      navigation.navigate(routeFor(link.path), link.parameters);
    }
  } catch {
    await Linking.openURL(url);
  }
}
```

Subscribe to React Native `Linking` initial URL and URL events. Configure
Associated Domains on iOS and an auto-verified App Link intent filter on
Android. The SDK never performs application navigation.

Android deferred attribution is available only after consent is granted:

```tsx
const deferred = await WtsSdk.getDeferredDeepLink();
```

## SDK Test & Validate

Detect the dashboard pairing route before normal link handling and pass it to
`joinTestSession`. Test Session V2 uses the same unified consent state. A test
Experience is rendered automatically through the native renderer and never
enters the production Experience queue.

```tsx
await WtsSdk.joinTestSession(pairingUrl);
const diagnostics = await WtsSdk.getTestSessionDiagnostics();
const result = await WtsSdk.runTestSessionProbes();
await WtsSdk.leaveTestSession();
```

The wrapper has no legacy bridge, IDFA/GAID access, pasteboard attribution,
fingerprinting, or automatic application navigation. See `example`,
[`SECURITY.md`](SECURITY.md), and [`SUPPORT.md`](SUPPORT.md).
