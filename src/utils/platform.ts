import os from 'node:os';

export function getPlatformInfo() {
  return {
    os: os.type(),
    platform: process.platform,
    arch: os.arch(),
    release: os.release(),
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',
    homedir: os.homedir(),
    tmpdir: os.tmpdir(),
    cpus: os.cpus().length,
    nodeVersion: process.version,
  };
}

export function getExecutableName(cmd: string): string {
  if (process.platform === 'win32') {
    // If command doesn't already have an extension, npm/npx/docker are .cmd or .exe
    return cmd;
  }
  return cmd;
}
