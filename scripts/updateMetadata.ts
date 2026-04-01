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

const stickerDescriptions: Record<string, string[]> = {
    layla: [
        'Layla posiert mit Arm über Kopf auf Felsen an der Küste — grünes Dessous, blauer Himmel.',
        'Layla lehnt entspannt an einem Felsen und blickt in den Himmel — natürlich und verträumt.',
        'Layla sitzt verführerisch auf Küstenfelsen und blickt direkt in die Kamera.',
        'Layla am Strand — Rücken zur Kamera, Arm im Nacken, Bikini, Meerblick.',
        'Layla steht aufrecht am Strand und blickt zur Seite — Bikini, Sand, Wellen.',
        'Layla posiert am Strand mit Sonnenbrille und Bikini — Sommer-Vibes.',
        'Layla liegt in Rückenlage auf dem Bett und blickt in die Kamera — intim und direkt.',
        'Layla auf dem Bett mit Beinen hochgestreckt — kreative, verspielte Pose.',
        'Layla sitzt entspannt auf dem Bett in schwarzem Dessous — elegant und sinnlich.',
        'Layla macht ein Spiegel-Selfie in schwarzer Unterwäsche — lässig und authentisch.',
        'Layla lächelt mit Brille und Ohrringen — Persönlichkeit pur.',
        'Layla posiert mit Arm im Nacken in orangefarbenem Zweiteiler — stylish und selbstbewusst.',
    ],
    christine: [
        'Christine lächelt direkt in die Kamera — ein warmes, einladendes Portrait.',
        'Christine sitzt auf einer Steinmauer im Sommerkleid — entspannt in der Natur.',
        'Christine am Strand, Rücken zur Kamera — blond, Meer, Sommergefühl.',
        'Christine posiert mit gelbem Handtuch — frisch und natürlich.',
        'Christine sitzt entspannt auf dem Sofa in weißem Oberteil — gemütlich und nahbar.',
        'Christine im Spiegel in weißer Spitze-Dessous — elegant und feminin.',
        'Christine im Lotussitz auf der Yogamatte — sportlich und ausgeglichen.',
        'Christine liegt auf einem Strandtuch und blickt in die Kamera — Strand-Feeling.',
        'Christine sitzt lächelnd im Gras — natürlich, entspannt und lebensfroh.',
        'Christine im Bikini mit Sonnenbrille, lächelnd — Sommer, Sonne, gute Laune.',
        'Christine in weißer Spitze-Unterwäsche auf einem Stuhl — elegant und sinnlich.',
        'Christine im Leoparden-Print auf weißer Bank — mutig und individuell.',
    ],
};

function updateMetadata() {
    for (const modelKey of ['layla', 'christine'] as const) {
        const model = selection[modelKey];
        const modelDir = path.join(METADATA_DIR, modelKey);
        const modelName = model.model as string;
        const descriptions = stickerDescriptions[modelKey];

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
                name: `${modelName} Sticker #${stickerNum}`,
                description: `${descriptions[i]} Mehr von ${modelName}: ${ofLinks[modelKey]}`,
                image: `${BASE_URL}/${modelKey}/images/${i}.png`,
                attributes: [
                    { trait_type: 'Model', value: modelName },
                    { trait_type: 'Sticker Nr.', value: String(stickerNum) },
                    { trait_type: 'Typ', value: isFree ? 'Gratis' : 'Premium' },
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
