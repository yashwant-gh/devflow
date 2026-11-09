import path from 'node:path';
import fs from 'fs-extra';
import fg from 'fast-glob';
import { projectDetector } from '../../core/project-detector.js';
import { FileManager, type FileOperationResult } from '../../core/file-manager.js';
import { ConfigurationError } from '../../utils/errors.js';

export interface DocsGenerateOptions {
  cwd?: string;
  dryRun?: boolean;
  force?: boolean;
}

export class DocsService {
  public async generate(options: DocsGenerateOptions = {}): Promise<FileOperationResult> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);
    const fileManager = new FileManager(root, { dryRun: options.dryRun });
    const readmePath = 'README.md';

    const exists = await fileManager.exists(readmePath);
    let existingContent = '';
    if (exists) {
      existingContent = await fileManager.readFile(readmePath);
    }

    const generatedDocs = await this.buildDocumentation(root, projectInfo);

    let finalContent = '';
    const managedStartTag = '<!-- devflow:managed:start -->';
    const managedEndTag = '<!-- devflow:managed:end -->';

    if (
      exists &&
      existingContent.includes(managedStartTag) &&
      existingContent.includes(managedEndTag)
    ) {
      // Replace only within managed markers
      const pre = existingContent.substring(
        0,
        existingContent.indexOf(managedStartTag) + managedStartTag.length,
      );
      const post = existingContent.substring(existingContent.indexOf(managedEndTag));
      finalContent = `${pre}\n\n${generatedDocs}\n\n${post}`;
    } else if (exists && !options.force) {
      throw new ConfigurationError(
        'README.md already exists and contains unmanaged content. Pass --force to overwrite or add <!-- devflow:managed:start --> markers.',
        {
          suggestion: 'Run "devflow docs generate --force" to replace or insert managed markers.',
        },
      );
    } else {
      finalContent = `${managedStartTag}\n${generatedDocs}\n${managedEndTag}\n`;
    }

    return await fileManager.writeFile(readmePath, finalContent, {
      overwrite: true,
      dryRun: options.dryRun,
    });
  }

  private async buildDocumentation(root: string, projectInfo: any): Promise<string> {
    const isNode =
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      !!projectInfo.packageJsonPath;

    let scriptsSection = '';
    let description = `${projectInfo.name} application`;

    if (
      isNode &&
      projectInfo.packageJsonPath &&
      (await fs.pathExists(projectInfo.packageJsonPath))
    ) {
      try {
        const pkg = await fs.readJson(projectInfo.packageJsonPath);
        if (pkg.description) description = pkg.description;
        if (pkg.scripts) {
          scriptsSection = '### Available Scripts\n\n| Script | Command |\n|---|---|\n';
          for (const [name, cmd] of Object.entries(pkg.scripts)) {
            scriptsSection += `| \`npm run ${name}\` | \`${cmd}\` |\n`;
          }
        }
      } catch {
        // Ignored
      }
    }

    // Inspect environment variables from .env.example
    let envSection = '';
    const envExamplePath = path.join(root, '.env.example');
    if (await fs.pathExists(envExamplePath)) {
      const envContent = await fs.readFile(envExamplePath, 'utf-8');
      const lines = envContent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l.includes('='));

      if (lines.length > 0) {
        envSection = '### Environment Variables\n\n| Variable | Default Value |\n|---|---|\n';
        for (const line of lines) {
          const [key, ...vals] = line.split('=');
          envSection += `| \`${key?.trim()}\` | \`${vals.join('=').trim() || '(empty)'}\` |\n`;
        }
      }
    }

    // Detect file tree overview
    const topFiles = await fg('*', { cwd: root, onlyFiles: false, deep: 1 });
    const structureList = topFiles
      .filter((f) => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist')
      .map((f) => `- \`${f}\``)
      .join('\n');

    return `# ${projectInfo.name}

> ${description}

Managed and standardized with [DevFlow](https://github.com/devflow-cli/devflow).

## Technology Stack

- **Project Type:** \`${projectInfo.type}\`
- **Package Manager:** \`${projectInfo.packageManager}\`
- **Git Version Control:** \`${projectInfo.hasGit ? 'Initialized' : 'Not initialized'}\`
- **Docker Support:** \`${projectInfo.hasDocker ? 'Enabled' : 'Not configured'}\`
- **CI/CD Automation:** \`${projectInfo.hasCI ? 'Enabled' : 'Not configured'}\`

## Directory Structure Overview

${structureList || '- Standard repository structure'}

## Getting Started

### Installation

\`\`\`bash
${isNode ? 'npm install' : 'python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"'}
\`\`\`

${envSection ? `### Configuration\n\nCopy the example environment configuration:\n\n\`\`\`bash\ncp .env.example .env\n\`\`\`\n\n${envSection}\n` : ''}
### Development

\`\`\`bash
${isNode ? 'npm run dev' : 'uvicorn app.main:app --reload'}
\`\`\`

### Testing & Quality Checks

\`\`\`bash
${isNode ? 'npm test\nnpm run lint' : 'pytest\nruff check .'}
\`\`\`

${scriptsSection}
${
  projectInfo.hasDocker
    ? `## Container Deployment

\`\`\`bash
docker compose up --build
\`\`\`
`
    : ''
}
`;
  }
}

export const docsService = new DocsService();
