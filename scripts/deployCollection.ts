import { Address, toNano } from '@ton/core';
import { NftCollection, buildCollectionContentCell } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const OWNER_ADDRESS = Address.parse('UQAJ66BxA4ck92h9CVrSE3ES6bYK_xhzxBwN_oXd01Isn-fZ');

    const modelName = await ui.input('Model name (z.B. layla, christine):');
    const BASE_URL = `https://raw.githubusercontent.com/flow-84/dof-nft/main/metadata/${modelName}/`;

    const content = buildCollectionContentCell(BASE_URL);

    const collection = provider.open(
        await NftCollection.fromInit(
            OWNER_ADDRESS,
            content,
            {
                $$type: 'RoyaltyParams',
                numerator: 50n,       // 5% royalty
                denominator: 1000n,
                destination: OWNER_ADDRESS,
            },
            toNano('1'),   // mint_price: 1 TON
            100n,          // max_per_sticker: 100 copies
            12n,           // total_stickers: 12
            3n,            // free_sticker_count: first 3 free
        )
    );

    // Deploy collection (no initial mint needed — users mint themselves)
    await collection.send(provider.sender(), { value: toNano('0.15') }, {
        $$type: 'MintNft',
        query_id: 0n,
        sticker_id: 0n,
        item_owner: OWNER_ADDRESS,
    });

    await provider.waitForDeploy(collection.address);

    console.log(`\n${modelName.toUpperCase()} NFT Collection deployed!`);
    console.log(`Address: ${collection.address.toString()}`);
    console.log(`Owner: ${OWNER_ADDRESS.toString()}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`\nConfig:`);
    console.log(`  Preis: 1 TON (Sticker #4-#12)`);
    console.log(`  Gratis: Sticker #1-#3 (Owner Airdrop)`);
    console.log(`  Max pro Sticker: 100 Kopien`);
    console.log(`  Total Sticker-Typen: 12`);
    console.log(`\nFans minten via PublicMint Message (1 TON + Gas).`);
    console.log(`Gratis-Sticker via MintNft (Owner/Bot Airdrop).`);
}
