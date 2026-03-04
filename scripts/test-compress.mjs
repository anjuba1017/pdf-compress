/**
 * Test script: compress a PDF using @okathira/ghostpdl-wasm (Ghostscript WASM).
 * Usage: node scripts/test-compress.mjs <path-to-pdf>
 * Example: node scripts/test-compress.mjs "../Form (1).pdf"
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import loadWASM from '@okathira/ghostpdl-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const inputPath = process.argv[2]
	? resolve(process.cwd(), process.argv[2])
	: resolve(projectRoot, '..', 'Form (1).pdf');

async function run() {
	try {
		console.log('Input PDF:', inputPath);

		const pdfBuffer = readFileSync(inputPath);
		const originalSize = pdfBuffer.length;
		console.log('Original size:', (originalSize / 1024 / 1024).toFixed(2), 'MB');

		const preset = process.env.PRESET || '/screen';
		console.log('Compressing with Ghostscript preset:', preset, '...');

		// Load WASM
		console.log('Loading WASM module...');
		const Module = await loadWASM();

		// Write to VFS
		const inputVfsPath = 'input.pdf';
		const outputVfsPath = 'output.pdf';
		Module.FS.writeFile(inputVfsPath, new Uint8Array(pdfBuffer));

		// Execute GS
		Module.callMain([
			'-sDEVICE=pdfwrite',
			'-dCompatibilityLevel=1.4',
			`-dPDFSETTINGS=${preset}`,
			'-dNOPAUSE',
			'-dBATCH',
			'-dQUIET',
			`-sOutputFile=${outputVfsPath}`,
			inputVfsPath,
		]);

		// Read result
		const outputUint8 = Module.FS.readFile(outputVfsPath);
		const compressedBuffer = Buffer.from(outputUint8);
		const compressedSize = compressedBuffer.length;

		const outPath = inputPath.replace(/\.pdf$/i, '.wasm-compressed.pdf');
		writeFileSync(outPath, compressedBuffer);

		const saved = ((originalSize - compressedSize) / originalSize) * 100;

		console.log('Compressed size:', (compressedSize / 1024 / 1024).toFixed(2), 'MB');
		console.log('Saved:', saved.toFixed(2), '%');
		console.log('Output:', outPath);

		// Cleanup
		Module.FS.unlink(inputVfsPath);
		Module.FS.unlink(outputVfsPath);

	} catch (error) {
		console.error('Compression failed:', error);
	}
}

run();
