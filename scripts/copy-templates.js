import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srcTemplates = path.join(rootDir, 'src', 'templates');
const distTemplates = path.join(rootDir, 'dist', 'templates');

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
  if (!(await fs.pathExists(srcTemplates))) {
    throw new Error(`Template source directory not found: ${srcTemplates}`);
  }

  console.log('Cleaning compiled template directory...');
  await fs.emptyDir(distTemplates);

  console.log(`Copying templates from ${srcTemplates} to ${distTemplates}...`);
  await fs.copy(srcTemplates, distTemplates, { filter: templateFilter });

  console.log('Templates copied successfully.');
}

copyTemplates().catch((err) => {
  console.error('Failed to copy templates:', err);
  process.exit(1);
});
