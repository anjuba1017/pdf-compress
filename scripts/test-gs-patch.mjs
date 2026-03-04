import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(__dirname, '..', '..', 'Form (1).pdf');
const pdfBuffer = readFileSync(pdfPath);
const pathToGs = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  '@jspawn',
  'ghostscript-wasm',
  'gs.wasm',
).replace('file://', '');

let postRunResolve;
const done = new Promise((r) => { postRunResolve = r; });

global.Module = {
  locateFile: (filename) => (filename === 'gs.wasm' ? pathToGs : filename),
  preRun: [
    () => {
      console.error('preRun called');
      if (global.Module && global.Module.FS) {
        global.Module.FS.writeFile('input.pdf', new Uint8Array(pdfBuffer));
        console.error('wrote input.pdf');
      } else {
        console.error('no FS');
      }
    },
  ],
  postRun: [
    () => {
      console.error('postRun called');
      try {
        const out = global.Module.FS.readFile('output.pdf', { encoding: 'binary' });
        writeFileSync(join(__dirname, '..', '..', 'Form (1).test-out.pdf'), Buffer.from(out));
        console.error('wrote output', out.length);
      } catch (e) {
        console.error('postRun error', e);
      }
      postRunResolve();
    },
  ],
  print: () => {},
  printErr: () => {},
  setStatus: () => {},
};

const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
global.Module._ourMarker = true;
console.error('calling require...');
const out = require('@jspawn/ghostscript-wasm/gs.js');
console.error('require returned', typeof out);
console.error('global.Module._ourMarker', global.Module._ourMarker);
console.error('global.Module.preRun', Array.isArray(global.Module.preRun) ? global.Module.preRun.length : global.Module.preRun);
await done;
console.error('done');
