import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// 開発依存パッケージを外部として扱う
const devDependencies = Object.keys(pkg.devDependencies || {});

await build({
  entryPoints: ['server/_core/index.ts'],
  platform: 'node',
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  // 開発依存パッケージを明示的に外部として指定
  external: devDependencies,
});
