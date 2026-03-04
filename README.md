# n8n-nodes-pdf-compress

Compress PDF files in n8n workflows using Ghostscript compiled to WebAssembly. This node is pure JavaScript/WebAssembly and does **not** require Ghostscript to be installed on the system.

## Features

- **Pure JS/WASM**: Works in any n8n environment (Docker, Cloud, Desktop) without additional system dependencies.
- **Ghostscript Power**: Uses the industry-standard Ghostscript engine (via `@okathira/ghostpdl-wasm`) for high-quality compression.
- **Compression Presets**: Choose between different quality/size trade-offs (Screen, Ebook, Printer, Prepress, Default).

## Presets

- **Screen**: Lowest quality, smallest file size (72 dpi). Ideal for web viewing.
- **Ebook**: Medium quality, medium file size (150 dpi). Good balance for reading on devices.
- **Printer**: High quality (300 dpi). Suitable for home/office printing.
- **Prepress**: Highest quality (300 dpi). Preserves color and quality for professional printing.
- **Default**: Standard Ghostscript compression settings.

## Usage in n8n

1. Add the **PDF Compress** node to your workflow.
2. Select the **Binary Property** where your PDF is located (default: `data`).
3. Choose a **Compression Quality** preset.
4. The node will output the compressed PDF in the same binary property (with `.compressed.pdf` suffix) and add compression stats to the JSON output.

## JSON Output Example

```json
{
  "pdfCompress": {
    "originalSizeBytes": 12110000,
    "compressedSizeBytes": 1240000,
    "percentageSaved": "89.76%",
    "presetUsed": "/screen"
  }
}
```

## Developer Notes

This node was built using:
- [n8n Node SDK](https://docs.n8n.io/integrations/creating-nodes/)
- [@okathira/ghostpdl-wasm](https://www.npmjs.com/package/@okathira/ghostpdl-wasm)

To test locally:
```bash
node scripts/test-compress.mjs <path-to-pdf>
```

## License

This project is licensed under the **AGPL-3.0-or-later** license. This is required because the project depends on Ghostscript (via `@okathira/ghostpdl-wasm`), which is also licensed under the AGPL. See the [LICENSE](LICENSE) file for details.
