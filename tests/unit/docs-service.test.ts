import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocsService } from '../../src/modules/documentation/docs-service.js';

describe('DocsService Documentation Generator', () => {
  let tempDir: string;
  let docsService: DocsService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devflow-docs-test-'));
    docsService = new DocsService();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should generate managed README.md', async () => {
    await fs.writeJson(path.join(tempDir, 'package.json'), {
      name: 'docs-sample-project',
      description: 'Sample project for documentation testing',
      scripts: {
        dev: 'tsx src/index.ts',
        test: 'vitest run',
      },
    });

    const result = await docsService.generate({ cwd: tempDir, force: true });
    expect(result.action).toBe('created');

    const content = await fs.readFile(path.join(tempDir, 'README.md'), 'utf-8');
    expect(content).toContain('# docs-sample-project');
    expect(content).toContain('<!-- devflow:managed:start -->');
    expect(content).toContain('<!-- devflow:managed:end -->');
    expect(content).toContain('`npm run dev`');
    expect(content).toContain('`npm run test`');
  });

  it('should preserve custom content outside managed markers', async () => {
    const existingReadme = `# Custom Header

Here is my custom manual architecture description.

<!-- devflow:managed:start -->
Old auto content
<!-- devflow:managed:end -->

## Custom Footer
Contact support@company.internal
`;
    await fs.writeFile(path.join(tempDir, 'README.md'), existingReadme);

    await docsService.generate({ cwd: tempDir });

    const updated = await fs.readFile(path.join(tempDir, 'README.md'), 'utf-8');
    expect(updated).toContain('# Custom Header');
    expect(updated).toContain('Here is my custom manual architecture description.');
    expect(updated).toContain('## Custom Footer');
    expect(updated).not.toContain('Old auto content');
  });
});
