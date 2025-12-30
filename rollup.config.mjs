import del from 'rollup-plugin-delete';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [del({ targets: 'dist/*', runOnce: true }), typescript()],
  external: ['fs', 'path', 'git-rev-sync', 'screeps-api'],
};
