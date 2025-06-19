# Rollup Plugin for Screeps World

## Install

```
npm install --save-dev @coconutbird/plugin-screeps-rollup
```

## Usage

In `rollup.config.mjs`

```mjs
import screeps from "@coconutbird/plugin-screeps-rollup";

export default {
  // ...
  output: {
    sourcemap: true // If set to true your source maps will be made screeps friendly and uploaded
  },
  plugins: [
    // ...
    screeps({
      config: "./screeps.config.json", // The path to read the config from
      destination: process.env.DEST // The server to upload the code to
    })
  ]
};
```

Example `package.json` scripts

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

### Config File

@coconutbird/plugin-screeps-rollup needs your screeps username/password or token and the server to upload to.

```json
{
  "main": {
    "token": "<TOKEN>",
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "branch": "main"
  },
  "sim": {
    "token": "<TOKEN>",
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "branch": "sim"
  },
  "season": {
    "token": "<TOKEN>",
    "protocol": "https",
    "hostname": "screeps.com",
    "path": "/season",
    "port": 443,
    "branch": "season"
  },
  "pserver": {
    "email": "name@server.tld",
    "password": "<PASSWORD>",
    "protocol": "http",
    "hostname": "127.0.0.1",
    "port": 21025,
    "branch": "main"
  }
}
```

If `branch` is set to `"auto"` @coconutbird/plugin-screeps-rollup will use your current git branch as the name of the branch on screeps, if you set it to anything else that string will be used as the name of the branch.

## Credits

@Arcath for the original project, this is a modernized rewrite for Rollup V4 with bugs fixed.

https://github.com/Arcath/rollup-plugin-screeps
