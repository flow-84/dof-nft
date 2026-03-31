import { Address, toNano, beginCell } from '@ton/core';
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
            }
        )
    );

    // Deploy with first mint
    await collection.send(provider.sender(), { value: toNano('0.25') }, {
        $$type: 'MintNft',
        query_id: 0n,
        item_index: 0n,
        item_owner: OWNER_ADDRESS,
        individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
    });

    await provider.waitForDeploy(collection.address);

    console.log(`\n${modelName} NFT Collection deployed at: ${collection.address.toString()}`);
    console.log(`Owner: ${OWNER_ADDRESS.toString()}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Minted NFT #0 to owner`);
    console.log(`\nNaechster Schritt: npx blueprint run mintBatch --mainnet`);
}
