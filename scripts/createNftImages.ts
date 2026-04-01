/**
 * Create NFT Sticker images with branded frame overlay
 * Usage: npx tsx scripts/createNftImages.ts
 *
 * Design:
 * - 1024x1365 portrait output (3:4 ratio, matches original photos)
 * - Purple gradient frame (#9335B6 → #b200ff) matching DOF branding
 * - Model name badge (top)
 * - Sticker number badge (top-right corner)
 * - "FREE" or "1 TON" badge (bottom-left)
 * - TON diamond icon (bottom-right)
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const selection = JSON.parse(fs.readFileSync(path.join(__dirname, 'nft-selection.json'), 'utf8'));

const OUTPUT_WIDTH = 1024;
const OUTPUT_HEIGHT = 1365;
const FRAME_WIDTH = 28;
const CORNER_RADIUS = 32;

/**
 * Build an SVG overlay with a transparent cutout in the center.
 * Uses fill-rule="evenodd" on a compound path so the inner area is see-through.
 */
function createFrameSvg(modelName: string, stickerNum: number, isFree: boolean): string {
    const w = OUTPUT_WIDTH;
    const h = OUTPUT_HEIGHT;
    const fw = FRAME_WIDTH;
    const cr = CORNER_RADIUS;
    const icr = cr - 10; // inner corner radius

    const badgeText = isFree ? 'FREE' : '1 TON';
    const badgeColor = isFree ? '#2ecc71' : '#f39c12';
    const badgeWidth = isFree ? 90 : 100;

    // Outer rounded rect path (clockwise)
    const outerPath = `M${cr},0 H${w - cr} Q${w},0 ${w},${cr} V${h - cr} Q${w},${h} ${w - cr},${h} H${cr} Q0,${h} 0,${h - cr} V${cr} Q0,0 ${cr},0 Z`;

    // Inner rounded rect path (counter-clockwise for evenodd cutout)
    const ix = fw, iy = fw, iw = w - fw * 2, ih = h - fw * 2;
    const innerPath = `M${ix + icr},${iy} H${ix + iw - icr} Q${ix + iw},${iy} ${ix + iw},${iy + icr} V${iy + ih - icr} Q${ix + iw},${iy + ih} ${ix + iw - icr},${iy + ih} H${ix + icr} Q${ix},${iy + ih} ${ix},${iy + ih - icr} V${iy + icr} Q${ix},${iy} ${ix + icr},${iy} Z`;

    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9335B6"/>
      <stop offset="100%" stop-color="#b200ff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.6)"/>
    </filter>
  </defs>

  <!-- Frame border with transparent cutout (evenodd) -->
  <path d="${outerPath} ${innerPath}" fill="url(#frameGrad)" fill-rule="evenodd"/>

  <!-- Inner shadow at top for text readability -->
  <rect x="${fw}" y="${fw}" width="${iw}" height="100" rx="${icr}" fill="rgba(0,0,0,0.35)"/>

  <!-- Inner shadow at bottom for badges -->
  <rect x="${fw}" y="${h - fw - 80}" width="${iw}" height="80" fill="rgba(0,0,0,0.45)"/>

  <!-- Model name badge (top center) -->
  <rect x="${w / 2 - 80}" y="${fw + 12}" width="160" height="34" rx="17" fill="rgba(147,53,182,0.9)" filter="url(#shadow)"/>
  <text x="${w / 2}" y="${fw + 35}" font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="bold" fill="white" text-anchor="middle">${modelName.toUpperCase()}</text>

  <!-- Sticker number badge (top-right) -->
  <circle cx="${w - fw - 28}" cy="${fw + 28}" r="22" fill="rgba(147,53,182,0.95)" stroke="white" stroke-width="2" filter="url(#shadow)"/>
  <text x="${w - fw - 28}" y="${fw + 34}" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">#${stickerNum + 1}</text>

  <!-- Price/Free badge (bottom-left) -->
  <rect x="${fw + 14}" y="${h - fw - 42}" width="${badgeWidth}" height="30" rx="15" fill="${badgeColor}" filter="url(#shadow)"/>
  <text x="${fw + 14 + badgeWidth / 2}" y="${h - fw - 21}" font-family="Arial,Helvetica,sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${badgeText}</text>

  <!-- TON diamond (bottom-right) -->
  <g transform="translate(${w - fw - 44}, ${h - fw - 44})" filter="url(#shadow)">
    <polygon points="15,0 30,11 24,30 6,30 0,11" fill="rgba(255,255,255,0.9)" stroke="#9335B6" stroke-width="1.5"/>
    <text x="15" y="21" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="bold" fill="#9335B6" text-anchor="middle">TON</text>
  </g>

  <!-- NFT collection label (bottom center) -->
  <text x="${w / 2}" y="${h - fw - 16}" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="rgba(255,255,255,0.55)" text-anchor="middle" letter-spacing="2.5">NFT STICKER COLLECTION</text>
</svg>`;
}

async function createNftImage(
    inputPath: string,
    outputPath: string,
    modelName: string,
    stickerIndex: number,
    isFree: boolean
): Promise<void> {
    // Resize original image to full output size (frame will overlay the edges)
    const resizedImage = await sharp(inputPath)
        .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'attention' })
        .toBuffer();

    // Create the frame overlay SVG (transparent center, opaque frame border)
    const frameSvg = createFrameSvg(modelName, stickerIndex, isFree);

    // Composite: image as base → frame overlay on top
    await sharp(resizedImage)
        .composite([
            {
                input: Buffer.from(frameSvg),
                left: 0,
                top: 0,
            },
        ])
        .jpeg({ quality: 92 })
        .toFile(outputPath);
}

async function main() {
    for (const modelKey of ['layla', 'christine']) {
        const model = selection[modelKey];
        const originalsDir = path.join(__dirname, '..', 'metadata', modelKey, 'originals');
        const nftDir = path.join(__dirname, '..', 'metadata', modelKey, 'images');
        fs.mkdirSync(nftDir, { recursive: true });

        console.log(`\nCreating ${model.model} NFT images...`);

        for (const img of model.images) {
            const inputPath = path.join(originalsDir, `${img.nftIndex}.jpg`);

            if (!fs.existsSync(inputPath)) {
                console.log(`  #${img.nftIndex} SKIP — original not found at ${inputPath}`);
                continue;
            }

            const outputPath = path.join(nftDir, `${img.nftIndex}.jpg`);
            const isFree = img.nftIndex < 3;

            try {
                process.stdout.write(`  #${img.nftIndex} ${img.setting} (${isFree ? 'FREE' : '1 TON'})...`);
                await createNftImage(inputPath, outputPath, model.model, img.nftIndex, isFree);
                const stat = fs.statSync(outputPath);
                console.log(` OK (${(stat.size / 1024).toFixed(0)} KB)`);
            } catch (err: any) {
                console.log(` FAILED: ${err.message}`);
            }
        }
    }

    console.log('\nDone! NFT images in metadata/{model}/images/');
}

main().catch(console.error);
