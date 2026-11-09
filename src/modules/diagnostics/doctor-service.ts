import path from 'node:path';
import fs from 'fs-extra';
import { getPlatformInfo } from '../../utils/platform.js';
import { commandRunner } from '../../core/command-runner.js';
import { projectDetector } from '../../core/project-detector.js';
import { dockerService } from '../docker/docker-service.js';
import { type DoctorReport, type DiagnosticItem } from '../../types/index.js';

export class DoctorService {
  public async diagnose(cwd?: string): Promise<DoctorReport> {
    const root = cwd || process.cwd();
    const platformInfo = getPlatformInfo();
    const projectInfo = await projectDetector.detect(root);

    const systemItems: DiagnosticItem[] = [
      {
        name: 'Operating System',
        category: 'SYSTEM',
        status: 'Installed',
        details: `${platformInfo.os} (${platformInfo.platform})`,
      },
      {
        name: 'Architecture',
        category: 'SYSTEM',
        status: 'Installed',
        details: platformInfo.arch,
      },
      {
        name: 'CPU Cores',
        category: 'SYSTEM',
        status: 'Installed',
        details: `${platformInfo.cpus} cores`,
      },
    ];

    const toolItems: DiagnosticItem[] = [];
    const recommendations: string[] = [];

    // Node.js
    toolItems.push({
      name: 'Node.js',
      category: 'TOOLS',
      status: 'Installed',
      version: process.version,
      required: true,
    });

    // npm
    const npmVersion = await this.getToolVersion('npm', ['--version']);
    toolItems.push({
      name: 'npm',
      category: 'TOOLS',
      status: npmVersion ? 'Installed' : 'Missing',
      version: npmVersion || undefined,
      required: true,
      recommendation: !npmVersion ? 'Install npm with Node.js.' : undefined,
    });
    if (!npmVersion) recommendations.push('npm is required for Node.js package management.');

    // Git
    const gitVersion = await this.getToolVersion('git', ['--version']);
    toolItems.push({
      name: 'Git',
      category: 'TOOLS',
      status: gitVersion ? 'Installed' : 'Missing',
      version: gitVersion || undefined,
      required: false,
      recommendation: !gitVersion
        ? 'Install Git for version control and change tracking.'
        : undefined,
    });
    if (!gitVersion)
      recommendations.push('Git is not installed. Install Git to enable version control features.');

    // Python
    const pythonVersion = await this.getToolVersion('python', ['--version']);
    toolItems.push({
      name: 'Python',
      category: 'TOOLS',
      status: pythonVersion ? 'Installed' : 'Missing',
      version: pythonVersion || undefined,
      required: projectInfo.type.startsWith('python'),
      recommendation:
        !pythonVersion && projectInfo.type.startsWith('python')
          ? 'Python is required for Python projects.'
          : undefined,
    });
    if (!pythonVersion && projectInfo.type.startsWith('python')) {
      recommendations.push('Python is missing but required for this Python project.');
    }

    // Docker CLI & Daemon diagnostics
    const dockerStatus = await dockerService.checkDockerStatus();
    const dockerVersion = await this.getToolVersion('docker', ['--version']);

    toolItems.push({
      name: 'Docker CLI',
      category: 'TOOLS',
      status: dockerStatus.installed ? 'Installed' : 'Missing',
      version: dockerVersion || undefined,
      required: false,
      details: dockerStatus.installed
        ? 'Docker client binary is available in PATH'
        : 'Not installed',
      recommendation: !dockerStatus.installed
        ? 'Install Docker Desktop if containerized workflows are required.'
        : undefined,
    });

    toolItems.push({
      name: 'Docker Daemon',
      category: 'TOOLS',
      status: dockerStatus.daemonRunning
        ? 'Installed'
        : dockerStatus.installed
          ? 'Unavailable'
          : 'Missing',
      version: dockerStatus.version || undefined,
      required: false,
      details: dockerStatus.daemonRunning
        ? 'Active and responding to engine commands'
        : dockerStatus.installed
          ? 'Docker Desktop daemon stopped'
          : 'Docker engine not installed',
      recommendation:
        dockerStatus.installed && !dockerStatus.daemonRunning
          ? 'Start Docker Desktop or start dockerd service to run container commands.'
          : undefined,
    });

    if (!dockerStatus.installed && projectInfo.hasDocker) {
      recommendations.push('Dockerfile detected, but Docker CLI is not installed on this machine.');
    } else if (dockerStatus.installed && !dockerStatus.daemonRunning && projectInfo.hasDocker) {
      recommendations.push(
        'Dockerfile detected, but Docker daemon is stopped. Start Docker Desktop.',
      );
    }

    // Docker Compose
    let composeVersion: string | null = null;
    if (dockerStatus.installed) {
      composeVersion = await this.getToolVersion('docker', ['compose', 'version']);
    }
    toolItems.push({
      name: 'Docker Compose',
      category: 'TOOLS',
      status: composeVersion ? 'Installed' : dockerStatus.installed ? 'Missing' : 'Unavailable',
      version: composeVersion || undefined,
      required: false,
    });

    // Project diagnostics
    const projectItems: DiagnosticItem[] = [
      {
        name: 'Project Name',
        category: 'PROJECT',
        status: 'Installed',
        details: projectInfo.name,
      },
      {
        name: 'Project Type',
        category: 'PROJECT',
        status: 'Installed',
        details: projectInfo.type,
      },
      {
        name: 'Package Manager',
        category: 'PROJECT',
        status: 'Installed',
        details: projectInfo.packageManager,
      },
    ];

    // Check project dependencies installed
    const hasNodeModules = await fs.pathExists(path.join(root, 'node_modules'));
    const hasVenv =
      (await fs.pathExists(path.join(root, '.venv'))) ||
      (await fs.pathExists(path.join(root, 'venv')));

    const isNode = projectInfo.type === 'node-api' || projectInfo.type === 'node-cli';
    const isPython = projectInfo.type === 'python-fastapi' || projectInfo.type === 'python-service';

    if (isNode) {
      projectItems.push({
        name: 'Dependencies',
        category: 'PROJECT',
        status: hasNodeModules ? 'Installed' : 'Missing',
        recommendation: !hasNodeModules ? 'Run "npm install" to install dependencies.' : undefined,
      });
      if (!hasNodeModules) {
        recommendations.push('Project dependencies are not installed. Run "npm install".');
      }
    } else if (isPython) {
      projectItems.push({
        name: 'Virtual Environment',
        category: 'PROJECT',
        status: hasVenv ? 'Installed' : 'Missing',
        recommendation: !hasVenv
          ? 'Create and activate a virtual environment with "python -m venv .venv".'
          : undefined,
      });
      if (!hasVenv) {
        recommendations.push(
          'Python virtual environment not detected. Create one with "python -m venv .venv".',
        );
      }
    }

    // Environment file
    projectItems.push({
      name: 'Environment (.env)',
      category: 'PROJECT',
      status: projectInfo.hasEnvFile ? 'Installed' : 'Missing',
      recommendation:
        !projectInfo.hasEnvFile && projectInfo.hasEnvExample
          ? 'Copy .env.example to .env to set up local environment.'
          : undefined,
    });
    if (!projectInfo.hasEnvFile && projectInfo.hasEnvExample) {
      recommendations.push('Project is missing .env file. Copy .env.example to .env.');
    }

    // Git initialization
    projectItems.push({
      name: 'Git Repository',
      category: 'PROJECT',
      status: projectInfo.hasGit ? 'Installed' : 'Missing',
      recommendation: !projectInfo.hasGit
        ? 'Initialize Git repository with "git init".'
        : undefined,
    });

    const overallHealthy =
      toolItems.filter((t) => t.required && t.status !== 'Installed').length === 0;

    return {
      timestamp: new Date().toISOString(),
      system: systemItems,
      tools: toolItems,
      project: projectItems,
      recommendations,
      overallHealthy,
    };
  }

  private async getToolVersion(cmd: string, args: string[]): Promise<string | null> {
    try {
      const isAvail = await commandRunner.isExecutableAvailable(cmd);
      if (!isAvail) return null;

      const res = await commandRunner.run(cmd, args, { allowFailure: true });
      if (res.exitCode === 0 && res.stdout) {
        const firstLine = res.stdout.trim().split('\n')[0] || '';
        return firstLine.replace(/^v/, '');
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const doctorService = new DoctorService();
