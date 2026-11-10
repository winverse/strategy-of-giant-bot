// Bundle this app's code (including the # aliases) into dist/main.js.
// npm dependencies stay external and load from node_modules at runtime:
// Nest loads optional packages lazily and Prisma ships its own engine files,
// so bundling them breaks. Run with `bun run build`, start with `bun run start:prod`.
import { rmSync } from 'node:fs';
import pkg from '../package.json';

const external = Object.keys(pkg.dependencies).flatMap((name) => [
  name,
  `${name}/*`,
]);

rmSync('dist', { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  target: 'bun',
  sourcemap: 'linked',
  external,
  // Bun.build otherwise bakes NODE_ENV in at build time ("development" when
  // unset), so the bundle would ignore NODE_ENV=production at runtime and load
  // config/development.ts. Keep it a runtime read.
  define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
});

if (!result.success) {
  console.error(result.logs.join('\n'));
  process.exit(1);
}

console.log(
  result.outputs
    .map((output) => `${output.path} ${(output.size / 1024).toFixed(1)} KB`)
    .join('\n'),
);
