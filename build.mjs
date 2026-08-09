#!/usr/bin/env node
// Node twin of build.py (this PC has no Python; run with the portable node at
// C:\Users\kylef\tools\node). Same output, same placeholder contract.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(root, 'shell.html'), 'utf8');
const three = readFileSync(join(root, 'lib', 'three.global.js'), 'utf8');
const parts = readdirSync(join(root, 'parts')).filter(f => f.endsWith('.js')).sort();
const tags = parts.map(f =>
  `<script>/* ===== ${f} ===== */\n${readFileSync(join(root, 'parts', f), 'utf8')}\n</script>`);
// replacer FUNCTIONS keep the replacement literal — a plain string here would
// expand $' / $& sequences that occur inside three.js and corrupt the build
let out = shell.replace('<script>/*__THREE__*/</script>', () => '<script>\n' + three + '\n</script>');
out = out.replace('<!--__PARTS__-->', () => tags.join('\n'));
const dst = join(root, 'my-brew.html');
writeFileSync(dst, out);
console.log(`built my-brew.html  (${Math.floor(out.length / 1024)} KB, ${parts.length} parts: ${parts.map(p => basename(p)).join(', ')})`);
