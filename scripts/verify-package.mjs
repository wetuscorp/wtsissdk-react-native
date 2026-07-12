import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['pack', '--dry-run', '--json', '--cache', '/tmp/wts-sdk-npm-cache'],
  { encoding: 'utf8' },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const [pack] = JSON.parse(result.stdout);
const forbidden = pack.files
  .map((item) => item.path)
  .filter((file) => /(^|\/)(build|node_modules|Pods|generated)(\/|$)|\.(env|jks|keystore|p12)$/.test(file));
if (forbidden.length) {
  throw new Error(`Forbidden files in npm package:\n${forbidden.join('\n')}`);
}
console.log(`npm package verified: ${pack.files.length} files, ${pack.size} bytes`);
