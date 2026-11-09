import YAML from 'yaml';
import { projectDetector } from '../../core/project-detector.js';
import { FileManager, type FileOperationResult } from '../../core/file-manager.js';
import { commandRunner } from '../../core/command-runner.js';
import { ConfigurationError } from '../../utils/errors.js';

export interface DockerGeneratorOptions {
  cwd?: string;
  dryRun?: boolean;
  overwrite?: boolean;
  includeCompose?: boolean;
  includePostgres?: boolean;
  includeRedis?: boolean;
  port?: number;
}

export interface DockerValidationResult {
  valid: boolean;
  hasDockerfile: boolean;
  hasCompose: boolean;
  dockerInstalled: boolean;
  daemonRunning: boolean;
  status: 'not_installed' | 'daemon_stopped' | 'running' | 'invalid_config';
  output?: string;
  error?: string;
  warnings: string[];
}

export interface DockerBuildResult {
  success: boolean;
  tag?: string;
  output: string;
  error?: string;
  failureReason?: 'not_installed' | 'daemon_stopped' | 'no_dockerfile' | 'build_failed';
}

export class DockerService {
  public async generate(options: DockerGeneratorOptions = {}): Promise<FileOperationResult[]> {
    const root = options.cwd || process.cwd();
    const projectInfo = await projectDetector.detect(root);
    const fileManager = new FileManager(root, { dryRun: options.dryRun });
    const results: FileOperationResult[] = [];

    const isNode =
      projectInfo.type === 'node-api' ||
      projectInfo.type === 'node-cli' ||
      !!projectInfo.packageJsonPath;
    const isPython =
      projectInfo.type === 'python-fastapi' ||
      projectInfo.type === 'python-service' ||
      !!projectInfo.pyprojectPath;

    if (!isNode && !isPython) {
      throw new ConfigurationError(
        'Could not detect Node.js or Python project type to generate Docker configurations.',
        {
          suggestion:
            'Ensure the project has a package.json or pyproject.toml before adding Docker.',
        },
      );
    }

    const port = options.port || (isNode ? 3000 : 8000);

    // 1. Generate Dockerfile
    let dockerfileContent = '';
    let dockerignoreContent = '';

    if (isNode) {
      dockerfileContent = `# Multi-stage Docker build for Node.js
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --if-present

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE ${port}
CMD ["node", "dist/server.js"]
`;
      dockerignoreContent = `node_modules
dist
coverage
.git
.env
*.log
`;
    } else {
      dockerfileContent = `# Lightweight Python Dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir --upgrade pip
COPY pyproject.toml* requirements.txt* ./
RUN if [ -f pyproject.toml ]; then pip install --no-cache-dir .; elif [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
COPY . .
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE ${port}
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "${port}"]
`;
      dockerignoreContent = `__pycache__
*.py[cod]
.venv
env
venv
.git
.env
.pytest_cache
`;
    }

    results.push(
      await fileManager.writeFile('Dockerfile', dockerfileContent, {
        overwrite: options.overwrite,
      }),
    );
    results.push(
      await fileManager.writeFile('.dockerignore', dockerignoreContent, {
        overwrite: options.overwrite,
      }),
    );

    // 2. Generate Docker Compose if requested
    if (options.includeCompose ?? true) {
      const composeObj: any = {
        services: {
          app: {
            build: {
              context: '.',
              dockerfile: 'Dockerfile',
            },
            ports: [`${port}:${port}`],
            environment: [`PORT=${port}`],
            restart: 'unless-stopped',
            healthcheck: {
              test: isNode
                ? [
                    'CMD',
                    'wget',
                    '--no-verbose',
                    '--tries=1',
                    '--spider',
                    `http://localhost:${port}/health`,
                  ]
                : [
                    'CMD',
                    'python',
                    '-c',
                    `import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')`,
                  ],
              interval: '30s',
              timeout: '5s',
              retries: 3,
              start_period: '10s',
            },
          },
        },
      };

      if (options.includePostgres) {
        composeObj.services.postgres = {
          image: 'postgres:16-alpine',
          environment: {
            POSTGRES_USER: 'devflow_user',
            POSTGRES_PASSWORD: 'devflow_password',
            POSTGRES_DB: `${projectInfo.name}_db`,
          },
          ports: ['5432:5432'],
          volumes: ['postgres_data:/var/lib/postgresql/data'],
          healthcheck: {
            test: ['CMD-SHELL', 'pg_isready -U devflow_user -d ' + `${projectInfo.name}_db`],
            interval: '10s',
            timeout: '5s',
            retries: 5,
          },
        };
        composeObj.services.app.depends_on = {
          postgres: {
            condition: 'service_healthy',
          },
        };
        composeObj.volumes = {
          postgres_data: null,
        };
      }

      if (options.includeRedis) {
        composeObj.services.redis = {
          image: 'redis:7-alpine',
          ports: ['6379:6379'],
          healthcheck: {
            test: ['CMD', 'redis-cli', 'ping'],
            interval: '10s',
            timeout: '5s',
            retries: 5,
          },
        };
        composeObj.services.app.depends_on = {
          ...(composeObj.services.app.depends_on || {}),
          redis: {
            condition: 'service_healthy',
          },
        };
      }

      const composeYaml = YAML.stringify(composeObj);
      results.push(
        await fileManager.writeFile('docker-compose.yml', composeYaml, {
          overwrite: options.overwrite,
        }),
      );
    }

    return results;
  }

  public async checkDockerStatus(): Promise<{
    installed: boolean;
    daemonRunning: boolean;
    version?: string;
    error?: string;
  }> {
    const isInstalled = await commandRunner.isExecutableAvailable('docker');
    if (!isInstalled) {
      return {
        installed: false,
        daemonRunning: false,
        error: 'Docker CLI is not installed or not in PATH.',
      };
    }

    try {
      const result = await commandRunner.run(
        'docker',
        ['version', '--format', '{{.Server.Version}}'],
        {
          timeout: 4000,
          allowFailure: true,
        },
      );
      if (result.exitCode === 0 && result.stdout.trim().length > 0) {
        return {
          installed: true,
          daemonRunning: true,
          version: result.stdout.trim(),
        };
      } else {
        return {
          installed: true,
          daemonRunning: false,
          error:
            'Docker CLI is installed, but Docker daemon is not running. Launch Docker Desktop or dockerd to start it.',
        };
      }
    } catch (err) {
      return {
        installed: true,
        daemonRunning: false,
        error: `Docker daemon check failed: ${(err as Error).message}`,
      };
    }
  }

  public async validate(cwd?: string): Promise<DockerValidationResult> {
    const root = cwd || process.cwd();
    const fileManager = new FileManager(root);
    const warnings: string[] = [];

    const hasDockerfile = await fileManager.exists('Dockerfile');
    const hasCompose =
      (await fileManager.exists('docker-compose.yml')) ||
      (await fileManager.exists('compose.yaml'));

    if (!hasDockerfile) {
      return {
        valid: false,
        hasDockerfile: false,
        hasCompose,
        dockerInstalled: false,
        daemonRunning: false,
        status: 'invalid_config',
        error: 'No Dockerfile found in current directory.',
        warnings,
      };
    }

    // Check basic Dockerfile syntax rules
    const dockerfileText = await fileManager.readFile('Dockerfile');
    if (!dockerfileText.includes('FROM ')) {
      return {
        valid: false,
        hasDockerfile: true,
        hasCompose,
        dockerInstalled: false,
        daemonRunning: false,
        status: 'invalid_config',
        error: 'Dockerfile does not contain a valid FROM instruction.',
        warnings,
      };
    }

    if (!dockerfileText.includes('USER ') && !dockerfileText.includes('user')) {
      warnings.push(
        'Security Warning: Dockerfile appears to run as root user. Consider adding a non-root USER instruction.',
      );
    }

    // Validate compose YAML if present
    if (hasCompose) {
      try {
        const composePath = (await fileManager.exists('docker-compose.yml'))
          ? 'docker-compose.yml'
          : 'compose.yaml';
        const yamlText = await fileManager.readFile(composePath);
        const parsed = YAML.parse(yamlText);
        if (!parsed || !parsed.services) {
          warnings.push('docker-compose file does not declare any services.');
        }
      } catch (err) {
        return {
          valid: false,
          hasDockerfile: true,
          hasCompose: true,
          dockerInstalled: false,
          daemonRunning: false,
          status: 'invalid_config',
          error: `docker-compose syntax error: ${(err as Error).message}`,
          warnings,
        };
      }
    }

    // Check Docker status
    const dockerStatus = await this.checkDockerStatus();

    if (!dockerStatus.installed) {
      warnings.push(
        'Docker CLI is not installed or not in PATH. Install Docker Desktop to run container workflows.',
      );
      return {
        valid: true,
        hasDockerfile: true,
        hasCompose,
        dockerInstalled: false,
        daemonRunning: false,
        status: 'not_installed',
        output: 'Static configuration is valid. Docker runtime is not installed.',
        warnings,
      };
    }

    if (!dockerStatus.daemonRunning) {
      warnings.push(
        'Docker CLI is installed, but the Docker daemon is stopped. Start Docker Desktop to run containers.',
      );
      return {
        valid: true,
        hasDockerfile: true,
        hasCompose,
        dockerInstalled: true,
        daemonRunning: false,
        status: 'daemon_stopped',
        output: 'Static configuration is valid. Docker CLI is installed, but daemon is stopped.',
        warnings,
      };
    }

    // If Docker is available and compose is present, run `docker compose config`
    if (hasCompose) {
      try {
        await commandRunner.run('docker', ['compose', 'config'], { cwd: root, timeout: 5000 });
        return {
          valid: true,
          hasDockerfile: true,
          hasCompose: true,
          dockerInstalled: true,
          daemonRunning: true,
          status: 'running',
          output: 'Docker configuration validated successfully via Docker CLI and active daemon.',
          warnings,
        };
      } catch (err: unknown) {
        const msg = (err as Error).message;
        warnings.push(`docker compose config returned an error: ${msg}`);
      }
    }

    return {
      valid: true,
      hasDockerfile: true,
      hasCompose,
      dockerInstalled: true,
      daemonRunning: true,
      status: 'running',
      output: 'Dockerfile static and runtime checks passed.',
      warnings,
    };
  }

  public async buildImage(
    options: {
      tag?: string;
      cwd?: string;
      dryRun?: boolean;
    } = {},
  ): Promise<DockerBuildResult> {
    const root = options.cwd || process.cwd();
    const fileManager = new FileManager(root);
    const tag = options.tag || 'devflow-app:latest';

    const hasDockerfile = await fileManager.exists('Dockerfile');
    if (!hasDockerfile) {
      return {
        success: false,
        output: '',
        error:
          'Cannot build image: No Dockerfile found in current directory. Run "devflow docker init" or "devflow add docker" first.',
        failureReason: 'no_dockerfile',
      };
    }

    if (options.dryRun) {
      return {
        success: true,
        tag,
        output: `[DRY-RUN] Would execute: docker build -t ${tag} .`,
      };
    }

    const status = await this.checkDockerStatus();
    if (!status.installed) {
      return {
        success: false,
        output: '',
        error:
          'Cannot build image: Docker CLI is not installed on this machine. Install Docker Desktop from https://www.docker.com/products/docker-desktop/',
        failureReason: 'not_installed',
      };
    }

    if (!status.daemonRunning) {
      return {
        success: false,
        output: '',
        error:
          'Cannot build image: Docker daemon is not running. Please start Docker Desktop and ensure the daemon is running before building images.',
        failureReason: 'daemon_stopped',
      };
    }

    try {
      const result = await commandRunner.run('docker', ['build', '-t', tag, '.'], {
        cwd: root,
        timeout: 300000,
        allowFailure: true,
      });

      if (result.exitCode === 0) {
        return {
          success: true,
          tag,
          output: result.stdout,
        };
      } else {
        return {
          success: false,
          tag,
          output: result.stdout,
          error: result.stderr || `Docker build exited with code ${result.exitCode}`,
          failureReason: 'build_failed',
        };
      }
    } catch (err) {
      return {
        success: false,
        tag,
        output: '',
        error: `Failed to execute docker build: ${(err as Error).message}`,
        failureReason: 'build_failed',
      };
    }
  }
}

export const dockerService = new DockerService();
