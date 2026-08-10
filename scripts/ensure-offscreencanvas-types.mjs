#!/usr/bin/env node
/** Ensure a minimal @types/offscreencanvas stub exists for @react-three/fiber. */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'node_modules/@types/offscreencanvas');
if (!existsSync(join(dir, 'index.d.ts'))) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.d.ts'), 'export {};\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: '@types/offscreencanvas', version: '0.0.0', types: 'index.d.ts' }, null, 2) +
      '\n',
  );
  console.info('Created @types/offscreencanvas stub');
}
