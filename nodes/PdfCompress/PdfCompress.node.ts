import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import loadWASM from '@okathira/ghostpdl-wasm';

export class PdfCompress implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Compress',
		name: 'pdfCompress',
		icon: 'file:pdfCompress.svg',
		group: ['transform'],
		version: [1],
		description: 'Reduce PDF size with Ghostscript (WASM), no system install.',
		defaults: {
			name: 'Compress PDF',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Input',
				name: 'inputNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				placeholder: 'data',
				description: 'The name of the binary property that contains the PDF (e.g., from "Read Binary File" or "HTTP Request"). Default is "data".',
			},
			{
				displayName: 'Compression',
				name: 'compressionNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Compression Quality',
				name: 'preset',
				type: 'options',
				options: [
					{ name: 'Balanced — Ebook (150 Dpi)', value: '/ebook', description: 'Good for tablets and e-readers' },
					{ name: 'Best Quality — Prepress (300 Dpi)', value: '/prepress', description: 'For professional print' },
					{ name: 'Print Quality — Printer (300 Dpi)', value: '/printer', description: 'For home/office printing' },
					{ name: 'Smallest File — Screen (72 Dpi)', value: '/screen', description: 'Best for web or email; lowest quality' },
					{ name: 'Standard — Default', value: '/default', description: 'Ghostscript default; moderate compression' },
				],
				default: '/screen',
				description: 'The Ghostscript PDFSETTINGS preset to use for compression',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data') as string;
		const preset = this.getNodeParameter('preset', 0, '/screen') as string;

		// Load the WASM module once per execution batch
		const Module = await loadWASM();

		for (let i = 0; i < items.length; i++) {
			try {
				const item = items[i];
				if (!item.binary?.[binaryPropertyName]) {
					throw new NodeOperationError(
						this.getNode(),
						`No binary property "${binaryPropertyName}" on item ${i}`,
						{ itemIndex: i },
					);
				}

				const pdfBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const fileName = item.binary[binaryPropertyName].fileName ?? 'document.pdf';

				// Ensure unique filenames within the VFS to avoid collisions during batch processing
				const inputVfsPath = `input_${i}_${Date.now()}.pdf`;
				const outputVfsPath = `output_${i}_${Date.now()}.pdf`;

				// Write input PDF to the Emscripten Virtual File System
				const inputUint8 = new Uint8Array(pdfBuffer);
				Module.FS.writeFile(inputVfsPath, inputUint8);

				// Execute Ghostscript WASM
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

				// Read output PDF from VFS
				const outputUint8 = Module.FS.readFile(outputVfsPath);
				const compressedBuffer = Buffer.from(outputUint8);

				// Cleanup VFS
				try {
					Module.FS.unlink(inputVfsPath);
					Module.FS.unlink(outputVfsPath);
				} catch {
					// Ignore cleanup errors
				}

				const originalSize = pdfBuffer.length;
				const compressedSize = compressedBuffer.length;
				const percentageSaved = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100).toFixed(2);

				const newItem: INodeExecutionData = {
					json: {
						...item.json,
						pdfCompress: {
							originalSizeBytes: originalSize,
							compressedSizeBytes: compressedSize,
							percentageSaved: `${percentageSaved}%`,
							presetUsed: preset,
						},
					},
					binary: {},
					pairedItem: { item: i },
				};

				const outputFileName = fileName.replace(/\.pdf$/i, '.compressed.pdf') || 'compressed.pdf';
				newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(
					compressedBuffer,
					outputFileName,
				);

				returnData.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
				} else {
					const err = error as Error & { context?: { itemIndex?: number } };
					if (err.context) {
						err.context.itemIndex = i;
						throw err;
					}
					throw new NodeOperationError(this.getNode(), err, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}
