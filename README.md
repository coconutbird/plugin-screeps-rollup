# Rollup Plugin for Screeps World

[![CI](https://github.com/coconutbird/plugin-screeps-rollup/actions/workflows/ci.yml/badge.svg)](https://github.com/coconutbird/plugin-screeps-rollup/actions/workflows/ci.yml)

A Rollup plugin that builds and deploys your code to Screeps servers.

## Install

```
npm install --save-dev @coconutbird/plugin-screeps-rollup
```

## Usage

In `rollup.config.mjs`:

```mjs
import screeps from '@coconutbird/plugin-screeps-rollup';

/** @type {import('rollup').RollupOptions} */
export default {
  // ...
  output: {
    dir: 'dist',
    sourcemap: true, // Source maps will be made Screeps-compatible and uploaded
  },
  plugins: [
    // ...
    await screeps({
      config: './screeps.config.json',
      destination: process.env.DEST,
    }),
  ],
};
```

Example `package.json` scripts:

```json
{
  "scripts": {
    "build": "rollup -c",
    "push:main": "rollup -c --environment DEST:main",
    "push:sim": "rollup -c --environment DEST:sim",
    "push:season": "rollup -c --environment DEST:season",
    "push:pserver": "rollup -c --environment DEST:pserver"
  }
}
```

## Plugin Options

| Option               | Type               | Default                 | Description                                                            |
| -------------------- | ------------------ | ----------------------- | ---------------------------------------------------------------------- |
| `config`             | `string \| object` | `"screeps.config.json"` | Path to config file or config object                                   |
| `destination`        | `string`           | `undefined`             | Server name from config to deploy to                                   |
| `allowNoDestination` | `boolean`          | `false`                 | If `true`, skips upload when no destination is set instead of throwing |
| `dryRun`             | `boolean`          | `false`                 | If `true`, builds without uploading to Screeps                         |

## Config File

Create a `screeps.config.json` file with your server configurations. Authentication can use either a token or email/password.

### Config Options

| Option     | Type     | Default         | Description                                                            |
| ---------- | -------- | --------------- | ---------------------------------------------------------------------- |
| `token`    | `string` | -               | API token (recommended). If provided, `email`/`password` are ignored   |
| `email`    | `string` | -               | Account email (required if no token)                                   |
| `password` | `string` | -               | Account password (required if no token)                                |
| `protocol` | `string` | `"https"`       | Server protocol                                                        |
| `hostname` | `string` | `"screeps.com"` | Server hostname                                                        |
| `port`     | `number` | `21025`         | Server port                                                            |
| `path`     | `string` | `"/"`           | API path (use `"/season"` for seasonal server)                         |
| `branch`   | `string` | `"default"`     | Screeps branch to deploy to. Set to `"auto"` to use current git branch |

### Example Config

```json
{
  "main": {
    "token": "<TOKEN>",
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "path": "/",
    "branch": "main"
  },
  "sim": {
    "token": "<TOKEN>",
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "path": "/",
    "branch": "sim"
  },
  "season": {
    "token": "<TOKEN>",
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "path": "/season",
    "branch": "default"
  },
  "pserver": {
    "email": "name@server.tld",
    "password": "<PASSWORD>",
    "protocol": "http",
    "hostname": "127.0.0.1",
    "port": 21025,
    "path": "/",
    "branch": "auto"
  }
}
```

> **Note:** Add `screeps.config.json` to your `.gitignore` to avoid committing credentials.

## Credits

[@Arcath](https://github.com/Arcath) for the original project. This is a modernized rewrite for Rollup V4 with bug fixes.

https://github.com/Arcath/rollup-plugin-screeps
