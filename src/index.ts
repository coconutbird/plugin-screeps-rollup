import fs from 'fs';
import path from 'path';
import type { OutputBundle, OutputOptions, Plugin } from 'rollup';
import git from 'git-rev-sync';

import { ScreepsAPI } from 'screeps-api';

const DEFAULT_CONFIG_FILE = 'screeps.config.json';

/**
 * The Screeps Rollup plugin configuration file data type.
 */
export type ScreepsRollupConfig = {
  [key: string]: {
    /**
     * The email for the Screeps account.
     */
    email?: string;
    /**
     * The password for the Screeps account.
     */
    password?: string;
    /**
     * The token to use for authentication.
     * If provided, `email` and `password` will be ignored.
     */
    token?: string;
    /**
     * The protocol to use for the Screeps server.
     * @default "https"
     */
    protocol?: string;
    /**
     * The server URL of the Screeps server.
     * @default "screeps.com"
     */
    hostname?: string;
    /**
     * The port of the Screeps server.
     * @default 21025
     */
    port?: number;
    /**
     * The path to the Screeps server API. This is usually "/".
     * If you are using a custom Screeps server, you might need to change this.
     * @default "/"
     */
    path: string;
    /**
     * The branch can be set to "auto" to automatically detect the branch from the git repository.
     */
    branch?: string | 'auto';
  };
};

/**
 * The Screeps Rollup plugin options.
 */
export type ScreepsRollupOptions = {
  /**
   * The config file path or the config object itself.
   * @default `screeps.config.json`
   */
  config?: ScreepsRollupConfig | string;
  /**
   * The destination server name in the config file.
   * @default undefined
   */
  destination?: string;
  /**
   * If `true`, the plugin will not throw an error if the destination is not passed.
   * @default false
   */
  allowNoDestination?: boolean;
  /**
   * If `true` the plugin will not upload the code to the Screeps server.
   * @default false
   */
  dryRun?: boolean;
};

type ScreepsCodeList = {
  [key: string]:
    | string
    | {
        binary: string;
      };
};

const generateSourceMaps = (bundle: OutputBundle) => {
  for (let itemName in bundle) {
    const item = bundle[itemName];

    if (itemName.endsWith('.js.map') && item.type === 'asset' && typeof item.source === 'string') {
      item.source = 'module.exports = ' + item.source + ';';
    }
  }
};

const getCodeList = async (distFile: string): Promise<ScreepsCodeList> => {
  const codeList: ScreepsCodeList = {};
  const files = fs.readdirSync(distFile);
  for (const file of files) {
    const filepath = path.join(distFile, file);

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

const upload = async (options: ScreepsRollupOptions, bundle: OutputBundle, distFile: string) => {
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

  const code = await getCodeList(distFile);
  if (!branches.list.some((x: any) => x.branch === branch)) {
    await api.raw.user.cloneBranch('', branch, code);
  }

  await api.code.set(branch, code, null);

  console.log(`Code uploaded to branch: ${branch}`);
};

export default async function screeps(screepsRollupOptions: ScreepsRollupOptions): Promise<Plugin> {
  if (!screepsRollupOptions) {
    screepsRollupOptions = {};
  }

  if (!screepsRollupOptions.config) {
    screepsRollupOptions.config = DEFAULT_CONFIG_FILE;
  }

  return {
    name: 'screeps',
    generateBundle: async (options: OutputOptions, bundle: OutputBundle): Promise<void> => {
      generateSourceMaps(bundle);
    },
    writeBundle: async (options: OutputOptions, bundle: OutputBundle): Promise<void> => {
      const distFile = options.dir || options.file;
      if (!distFile) {
        throw new Error('Output directory or file must be specified to read the code.');
      }

      if (!screepsRollupOptions.dryRun) {
        await upload(screepsRollupOptions, bundle, distFile);
      }
    },
  };
}
