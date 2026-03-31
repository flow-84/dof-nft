/**
 * Download selected NFT images from Google Drive
 * Usage: npx tsx scripts/downloadImages.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const selection = JSON.parse(fs.readFileSync(path.join(__dirname, 'nft-selection.json'), 'utf8'));

const OUTPUT_DIR = path.join(__dirname, '..', 'metadata');

function downloadFile(fileId: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Use Google Drive thumbnail API with max resolution for reliable downloads
        const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2048`;

        const request = (urlStr: string, redirectCount = 0) => {
            if (redirectCount > 5) {
                reject(new Error('Too many redirects'));
                return;
            }
            const urlObj = new URL(urlStr);
            const mod = urlObj.protocol === 'https:' ? https : require('http');
            mod.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res: any) => {
                if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
                    request(res.headers.location, redirectCount + 1);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} for ${fileId}`));
                    return;
                }
                const fileStream = fs.createWriteStream(outputPath);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
                fileStream.on('error', reject);
            }).on('error', reject);
        };

        request(url);
    });
}

async function main() {
    for (const modelKey of ['layla', 'christine']) {
        const model = selection[modelKey];
        const imagesDir = path.join(OUTPUT_DIR, modelKey, 'originals');
        fs.mkdirSync(imagesDir, { recursive: true });

        console.log(`\nDownloading ${model.model} images...`);

        for (const img of model.images) {
            const ext = '.jpg'; // All thumbnails come as JPEG
            const outputPath = path.join(imagesDir, `${img.nftIndex}${ext}`);

            if (fs.existsSync(outputPath)) {
                const stat = fs.statSync(outputPath);
                if (stat.size > 1000) {
                    console.log(`  #${img.nftIndex} already exists (${(stat.size / 1024).toFixed(0)} KB), skipping`);
                    continue;
                }
            }

            try {
                process.stdout.write(`  #${img.nftIndex} ${img.setting}...`);
                await downloadFile(img.fileId, outputPath);
                const stat = fs.statSync(outputPath);
                console.log(` OK (${(stat.size / 1024).toFixed(0)} KB)`);
            } catch (err: any) {
                console.log(` FAILED: ${err.message}`);
            }

            // Small delay between downloads
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log('\nDone! Check metadata/{model}/originals/');
}

main().catch(console.error);
