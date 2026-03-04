"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfCompress = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const ghostpdl_wasm_1 = __importDefault(require("@okathira/ghostpdl-wasm"));
class PdfCompress {
    constructor() {
        this.description = {
            displayName: 'PDF Compress',
            name: 'pdfCompress',
            icon: 'file:pdfCompress.svg',
            group: ['transform'],
            version: [1],
            description: 'Reduce PDF size with Ghostscript (WASM), no system install.',
            defaults: {
                name: 'Compress PDF',
            },
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
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
    }
    async execute() {
        var _a, _b;
        const items = this.getInputData();
        const returnData = [];
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');
        const preset = this.getNodeParameter('preset', 0, '/screen');
        const Module = await (0, ghostpdl_wasm_1.default)();
        for (let i = 0; i < items.length; i++) {
            try {
                const item = items[i];
                if (!((_a = item.binary) === null || _a === void 0 ? void 0 : _a[binaryPropertyName])) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `No binary property "${binaryPropertyName}" on item ${i}`, { itemIndex: i });
                }
                const pdfBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                const fileName = (_b = item.binary[binaryPropertyName].fileName) !== null && _b !== void 0 ? _b : 'document.pdf';
                const inputVfsPath = `input_${i}_${Date.now()}.pdf`;
                const outputVfsPath = `output_${i}_${Date.now()}.pdf`;
                const inputUint8 = new Uint8Array(pdfBuffer);
                Module.FS.writeFile(inputVfsPath, inputUint8);
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
                const outputUint8 = Module.FS.readFile(outputVfsPath);
                const compressedBuffer = Buffer.from(outputUint8);
                try {
                    Module.FS.unlink(inputVfsPath);
                    Module.FS.unlink(outputVfsPath);
                }
                catch {
                }
                const originalSize = pdfBuffer.length;
                const compressedSize = compressedBuffer.length;
                const percentageSaved = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100).toFixed(2);
                const newItem = {
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
                newItem.binary[binaryPropertyName] = await this.helpers.prepareBinaryData(compressedBuffer, outputFileName);
                returnData.push(newItem);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                }
                else {
                    const err = error;
                    if (err.context) {
                        err.context.itemIndex = i;
                        throw err;
                    }
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), err, { itemIndex: i });
                }
            }
        }
        return [returnData];
    }
}
exports.PdfCompress = PdfCompress;
//# sourceMappingURL=PdfCompress.node.js.map