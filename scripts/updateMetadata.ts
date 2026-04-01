/**
 * Update all metadata JSON files with image URLs and descriptions
 * Usage: npx tsx scripts/updateMetadata.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const selection = JSON.parse(fs.readFileSync(path.join(__dirname, 'nft-selection.json'), 'utf8'));
const BASE_URL = 'https://raw.githubusercontent.com/flow-84/dof-nft/main/metadata';
const METADATA_DIR = path.join(__dirname, '..', 'metadata');

const ofLinks: Record<string, string> = {
    layla: 'https://tinyurl.com/2cframgd',
    christine: 'https://tinyurl.com/2952mt79',
};

const descriptions: Record<string, string[]> = {
    layla: [
        'Wild coast vibes.',
        'Lost in thought.',
        'Confidence on the rocks.',
        'Ocean breeze.',
        'Sandy days.',
        'Sun-kissed.',
        'Eye contact.',
        'Playful energy.',
        'After dark.',
        'Mirror, mirror.',
        'Just me.',
        'Golden hour.',
    ],
    christine: [
        'Hey you.',
        'Summer in the city.',
        'Beach mode.',
        'Fresh & fearless.',
        'Cozy Sunday.',
        'Reflection.',
        'Inner balance.',
        'Vitamin sea.',
        'Green escape.',
        'Good vibes only.',
        'Elegance.',
        'Wild side.',
    ],
};

function updateMetadata() {
    for (const modelKey of ['layla', 'christine'] as const) {
        const model = selection[modelKey];
        const modelDir = path.join(METADATA_DIR, modelKey);
        const modelName = model.model as string;
        const modelDescriptions = descriptions[modelKey];

        // Update meta.json (collection metadata)
        const collectionPath = path.join(modelDir, 'meta.json');
        const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
        collection.image = `${BASE_URL}/${modelKey}/images/0.png`;
        fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
        console.log(`${modelName}: meta.json updated`);

        // Update individual item metadata
        for (let i = 0; i < 12; i++) {
            const itemPath = path.join(modelDir, `${i}.json`);
            const isFree = i < 3;
            const stickerNum = i + 1;

            const item = {
                name: `${modelName} #${stickerNum}`,
                description: `${modelDescriptions[i]} Mehr von ${modelName}: ${ofLinks[modelKey]}`,
                image: `${BASE_URL}/${modelKey}/images/${i}.png`,
                attributes: [
                    { trait_type: 'Model', value: modelName },
                    { trait_type: 'Edition', value: String(stickerNum) },
                    { trait_type: 'Typ', value: isFree ? 'Free' : 'Premium' },
                    { trait_type: 'Setting', value: model.images[i].setting },
                ],
            };

            fs.writeFileSync(itemPath, JSON.stringify(item, null, 2) + '\n');
        }
        console.log(`${modelName}: 12 item metadata files updated`);
    }

    console.log(`\nImage URL pattern: ${BASE_URL}/{model}/images/{index}.jpg`);
    console.log(`Metadata URL pattern: ${BASE_URL}/{model}/{index}.json`);
}

updateMetadata();
