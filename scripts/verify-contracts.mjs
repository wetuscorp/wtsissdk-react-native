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
async function checksum(root) {
  const inner = [];
  for (const file of await files(root)) {
    const digest = createHash('sha256').update(await readFile(file)).digest('hex');
    inner.push(`${digest}  ./${path.relative(root, file)}\n`);
  }
  return createHash('sha256').update(inner.join('')).digest('hex');
}

const actual = await checksum('contracts/mobile/v2');
if (actual !== metadata.fixtureChecksum) {
  throw new Error(`Mobile contract drift: expected ${metadata.fixtureChecksum}, got ${actual}`);
}
const identityActual = await checksum('contracts/identity/v1');
if (identityActual !== metadata.identityFixtureChecksum) {
  throw new Error(
    `Identity contract drift: expected ${metadata.identityFixtureChecksum}, got ${identityActual}`,
  );
}
