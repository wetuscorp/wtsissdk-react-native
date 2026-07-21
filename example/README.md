# React Native example

This app verifies `@wetusco/wts-sdk 0.5.0-alpha.1` with the matching Swift and
Android `0.5.0-alpha.1` native cores.

## Run

```bash
npm install
npm start
```

In another terminal:

```bash
npm run android
# or
cd ios && bundle exec pod install && cd .. && npm run ios
```

The example keeps consent UI and navigation application-owned. Configure once
with the public app key, call `setConsent('granted' | 'denied')` when the user
decides, and continue sending the app's existing `track` and `screen` events.
Experiences use the automatic native renderer; campaign creation or revision
does not add a client-side key.

For SDK Test & Validate, intercept
`https://<mobile-app-host>/_wts/test/pair?pairing=<token>` before normal
`WtsSdk.handle(url)` processing and call `joinTestSession(url)`. Pairing data
is short-lived, consent-gated, and isolated from production analytics and the
production Experience queue.
