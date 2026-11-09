import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srcTemplates = path.join(rootDir, 'src', 'templates');
const distTemplates = path.join(rootDir, 'dist', 'templates');
const rootTemplates = path.join(rootDir, 'templates');

function templateFilter(src) {
  const normalized = src.replace(/\\/g, '/');
  if (normalized.endsWith('.map') || normalized.endsWith('.d.ts')) {
    return false;
  }
  if (normalized.includes('/node_modules/') || normalized.includes('/dist/')) {
    return false;
  }
  return true;
}

async function copyTemplates() {
  if (await fs.pathExists(srcTemplates)) {
    console.log(`Cleaning target template directories...`);
    await fs.emptyDir(distTemplates);
    await fs.emptyDir(rootTemplates);

    console.log(`Copying templates from ${srcTemplates} to ${distTemplates} and ${rootTemplates}...`);
    await fs.copy(srcTemplates, distTemplates, { filter: templateFilter });
    await fs.copy(srcTemplates, rootTemplates, { filter: templateFilter });
    console.log('Templates copied successfully and cleanly.');
  }
}

copyTemplates().catch((err) => {
  console.error('Failed to copy templates:', err);
  process.exit(1);
});
