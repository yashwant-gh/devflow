export const PRODUCT_NAME = 'DevFlow';
export const PRODUCT_VERSION = '1.0.0';
export const PRODUCT_TAGLINE = 'Build smarter. Standardize everything. Ship with confidence.';
export const CONFIG_FILE_NAME = '.devflowrc.json';
export const USER_CONFIG_FILE_NAME = '.devflowrc.json';
export const DEFAULT_TIMEOUT_MS = 60000;
export const DEFAULT_EXEC_TIMEOUT_MS = 120000;

export const BANNER = `
    ██████╗ ███████╗██╗   ██╗███████╗██╗      ██████╗ ██╗    ██╗
    ██╔══██╗██╔════╝██║   ██║██╔════╝██║     ██╔═══██╗██║    ██║
    ██║  ██║█████╗  ██║   ██║█████╗  ██║     ██║   ██║██║ █╗ ██║
    ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║     ██║   ██║██║███╗██║
    ██████╔╝███████╗ ╚████╔╝ ██║     ███████╗╚██████╔╝╚███╔███╔╝
    ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ 
`;

export const SUPPORTED_PROJECT_TYPES = [
  'node-api',
  'node-cli',
  'python-fastapi',
  'python-service',
  'generic',
] as const;

export const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'pip', 'poetry', 'uv'] as const;

export const SUPPORTED_SEVERITIES = ['low', 'moderate', 'high', 'critical'] as const;
