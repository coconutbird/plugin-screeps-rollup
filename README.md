# Rollup Screeps Plugin

## Credits

@Arcath for the original project, this is a modernized rewrite for latest rollup with bugs fixed.

https://github.com/Arcath/rollup-plugin-screeps

## Install

```
npm install --save-dev @coconutbird/plugin-screeps-rollup
```

## Usage

In `rollup.config.mjs`

```mjs
import screeps from "@coconutbird/plugin-screeps-rollup";

...

export default {
  ...
  sourcemap: true, // If set to true your source maps will be made screeps friendly and uploaded

  plugins: [
    ...
    screeps({
      config: "./screeps.config.json", // If set will read the config file from path
      destination: "main" // If set will read the options for the entry otherwise default
    })
  ]
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
  "pserver": {
    "email": "name@server.tld",
    "password": "<PASSWORD>",
    "protocol": "http",
    "hostname": "1.1.1.1",
    "port": 21025,
    "branch": "main"
  }
}
```

If `branch` is set to `"auto"` @coconutbird/plugin-screeps-rollup will use your current git branch as the name of the branch on screeps, if you set it to anything else that string will be used as the name of the branch.
