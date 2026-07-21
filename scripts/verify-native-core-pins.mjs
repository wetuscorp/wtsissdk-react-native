import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const expected = '0.5.0-alpha.1';
if (pkg.version !== expected) {
  throw new Error(`Wrapper version must be ${expected}, got ${pkg.version}`);
}

const android = await readFile('android/build.gradle', 'utf8');
if (!android.includes(`implementation 'co.wetus:wts-sdk:${expected}'`)) {
  throw new Error(`Android native core must be pinned exactly to ${expected}`);
}

const podspec = await readFile('WtsSdkReactNative.podspec', 'utf8');
if (!podspec.includes(`s.version = '${expected}'`)) {
  throw new Error(`Podspec version must be ${expected}`);
}
if (!podspec.includes(`s.dependency 'WtsSDK', '${expected}'`)) {
  throw new Error(`iOS native core must be pinned exactly to ${expected}`);
}

console.log(`React Native and native cores are aligned at ${expected}`);
