import React, { useEffect, useState } from 'react';
import { Linking, SafeAreaView, StyleSheet, Text } from 'react-native';
import { WtsSdk } from '@wetus/wts-sdk-react-native';

const allowedRoutes = new Set(['/home', '/products/detail']);

export default function App() {
  const [status, setStatus] = useState('No deep link');

  useEffect(() => {
    void WtsSdk.configure('replace-with-public-app-key').then(async () => {
      const initial = await Linking.getInitialURL();
      if (initial) await handle(initial);
      const deferred = await WtsSdk.getDeferredDeepLink();
      if (deferred && allowedRoutes.has(deferred.path)) setStatus(`Deferred ${deferred.path}`);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => subscription.remove();
  }, []);

  async function handle(url: string) {
    try {
      const link = await WtsSdk.handle(url);
      setStatus(allowedRoutes.has(link.path) ? `Resolved ${link.path}` : 'Route rejected');
    } catch {
      setStatus('Using web fallback');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>wts.is SDK</Text>
      <Text>{status}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
});
