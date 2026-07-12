import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat().sort();
}

const metadata = JSON.parse(await readFile('.wts-contracts.json', 'utf8'));
const root = 'contracts/v1';
const inner = [];
for (const file of await files(root)) {
  const digest = createHash('sha256').update(await readFile(file)).digest('hex');
  inner.push(`${digest}  ./${path.relative(root, file)}\n`);
}
const actual = createHash('sha256').update(inner.join('')).digest('hex');
if (actual !== metadata.fixtureChecksum) {
  throw new Error(`Contract drift: expected ${metadata.fixtureChecksum}, got ${actual}`);
}
