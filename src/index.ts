import fs from 'fs';
import path from 'path';
import type { OutputBundle, OutputOptions, Plugin } from 'rollup';
import git from 'git-rev-sync';

import { ScreepsAPI } from 'screeps-api';

const DEFAULT_CONFIG_FILE = 'screeps.config.json';

/**
 * Server configuration for a Screeps deployment target.
 */
export type ScreepsServerConfig = {
  /**
   * The email for the Screeps account.
   * Required if `token` is not provided.
   */
  email?: string;
  /**
   * The password for the Screeps account.
   * Required if `token` is not provided.
   */
  password?: string;
  /**
   * The API token for authentication.
   * If provided, `email` and `password` will be ignored.
   * @see https://screeps.com/a/#!/account/auth-tokens
   */
  token?: string;
  /**
   * The protocol to use for the Screeps server.
   * @default "https"
   */
  protocol?: string;
  /**
   * The hostname of the Screeps server.
   * @default "screeps.com"
   */
  hostname?: string;
  /**
   * The port of the Screeps server.
   * @default 21025
   */
  port?: number;
  /**
   * The API path for the Screeps server.
   * Use "/season" for the seasonal server.
   * @default "/"
   */
  path?: string;
  /**
   * The branch to deploy code to.
   * Set to "auto" to use the current git branch name.
   * @default "default"
   */
  branch?: string | 'auto';
};

/**
 * Configuration file structure mapping destination names to server configs.
 * @example
 * ```json
 * {
 *   "main": { "token": "xxx", "branch": "main" },
 *   "pserver": { "email": "x", "password": "y", "hostname": "localhost" }
 * }
 * ```
 */
export type ScreepsRollupConfig = {
  [destination: string]: ScreepsServerConfig;
};

/**
 * Options for the Screeps Rollup plugin.
 */
export type ScreepsRollupOptions = {
  /**
   * Path to the config file or a config object.
   * @default "screeps.config.json"
   */
  config?: ScreepsRollupConfig | string;
  /**
   * The destination server name (key) from the config file.
   */
  destination?: string;
  /**
   * If `true`, skips upload when no destination is set instead of throwing an error.
   * @default false
   */
  allowNoDestination?: boolean;
  /**
   * If `true`, builds without uploading to the Screeps server.
   * Useful for testing builds locally.
   * @default false
   */
  dryRun?: boolean;
};

/**
 * Code list structure for Screeps API upload.
 */
type ScreepsCodeList = {
  [module: string]: string | { binary: string };
};

/**
 * Transforms source map files to be Screeps-compatible by wrapping them in module.exports.
 */
const generateSourceMaps = (bundle: OutputBundle): void => {
  for (const itemName in bundle) {
    const item = bundle[itemName];

    if (itemName.endsWith('.js.map') && item.type === 'asset' && typeof item.source === 'string') {
      item.source = 'module.exports = ' + item.source + ';';
    }
  }
};

/**
 * Reads all files from the dist directory and creates a code list for upload.
 * - .js files are read as text
 * - .js.map files are read as text (source maps)
 * - Other files are read as base64 binary
 */
const getCodeList = (distDir: string): ScreepsCodeList => {
  const codeList: ScreepsCodeList = {};
  const files = fs.readdirSync(distDir);

  for (const file of files) {
    const filepath = path.join(distDir, file);
    const parts = file.split('.');
    const filename = parts[0];
    const extension = parts.length > 1 ? parts.slice(1).join('.').toLowerCase() : '';

    if (extension === 'js') {
      codeList[filename] = fs.readFileSync(filepath, 'utf-8');
    } else if (extension === 'js.map') {
      codeList[file] = fs.readFileSync(filepath, 'utf-8');
    } else {
      codeList[filename] = {
        binary: fs.readFileSync(filepath).toString('base64'),
      };
    }
  }

  return codeList;
};

/**
 * Uploads the built code to the Screeps server.
 */
const upload = async (options: ScreepsRollupOptions, distDir: string): Promise<void> => {
  if (!options.config) {
    options.config = DEFAULT_CONFIG_FILE;
  }

  if (!options.destination) {
    if (options.allowNoDestination) {
      console.warn('No destination specified in options so no code will be uploaded.');

      return;
    }

    throw new Error('Destination must be specified in options or allowNoDestination is set.');
  }

  // Read the config file and parse it if it's a string
  if (typeof options.config === 'string') {
    if (!fs.existsSync(options.config)) {
      throw new Error(`Config file not found: ${options.config}`);
    }

    options.config = JSON.parse(fs.readFileSync(options.config, 'utf-8')) as ScreepsRollupConfig;
  }

  const config = options.config[options.destination];
  if (!config) {
    throw new Error(`No configuration found for destination: ${options.destination}`);
  }

  if ((!config.email || !config.password) && !config.token) {
    throw new Error("Either 'email' and 'password' or 'token' must be provided in the config.");
  }

  let branch: string;
  if (config.branch === 'auto') {
    branch = git.branch();

    if (!branch) {
      throw new Error('Failed to detect git branch. Ensure you are in a git repository.');
    }
  } else {
    branch = config.branch || 'default';
  }

  const api = new ScreepsAPI({
    email: config.email,
    password: config.password,
    token: config.token,
    protocol: config.protocol || 'https',
    hostname: config.hostname || 'screeps.com',
    port: config.port || 21025,
    path: config.path || '/',
    branch: branch,
  });

  // Authenticate if token is not provided
  if (!api.token) {
    const auth = await api.auth(config.email, config.password);

    if (!auth.ok) {
      throw new Error('Authentication failed');
    }

    api.token = auth.token;
  }

  const branches = await api.raw.user.branches();
  if (!branches.ok) {
    throw new Error('Failed to fetch branches');
  }

  const code = getCodeList(distDir);
  const branchExists = branches.list.some((x: { branch: string }) => x.branch === branch);
  if (!branchExists) {
    await api.raw.user.cloneBranch('', branch, code);
  }

  await api.code.set(branch, code, null);

  // eslint-disable-next-line no-console
  console.log(`Code uploaded to branch: ${branch}`);
};

/**
 * Creates a Rollup plugin that uploads built code to a Screeps server.
 *
 * @param options - Plugin configuration options
 * @returns A Rollup plugin instance
 *
 * @example
 * ```js
 * import screeps from '@coconutbird/plugin-screeps-rollup';
 *
 * export default {
 *   plugins: [
 *     await screeps({
 *       destination: process.env.DEST,
 *     }),
 *   ],
 * };
 * ```
 */
export default async function screeps(options: ScreepsRollupOptions = {}): Promise<Plugin> {
  if (!options.config) {
    options.config = DEFAULT_CONFIG_FILE;
  }

  return {
    name: 'screeps',
    generateBundle: (_options: OutputOptions, bundle: OutputBundle): void => {
      generateSourceMaps(bundle);
    },
    writeBundle: async (outputOptions: OutputOptions): Promise<void> => {
      const distDir = outputOptions.dir || outputOptions.file;
      if (!distDir) {
        throw new Error('Output directory or file must be specified to read the code.');
      }

      if (!options.dryRun) {
        await upload(options, distDir);
      }
    },
  };
}
