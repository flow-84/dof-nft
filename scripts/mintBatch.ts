import { Address, toNano, beginCell } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const collectionAddr = await ui.input('Collection address:');
    const collection = provider.open(NftCollection.fromAddress(Address.parse(collectionAddr)));

    const OWNER_ADDRESS = Address.parse('UQAJ66BxA4ck92h9CVrSE3ES6bYK_xhzxBwN_oXd01Isn-fZ');
    const modelName = await ui.input('Model name (z.B. layla, christine):');
    const BASE_URL = `https://raw.githubusercontent.com/flow-84/dof-nft/main/metadata/${modelName}/`;

    const currentIndex = await collection.getNextItemIndex();
    console.log(`\nAktueller Index: ${currentIndex}`);
    console.log(`Noch zu minten: ${12 - Number(currentIndex)} Items`);

    const startIndex = Number(currentIndex);
    const endIndex = 12;

    if (startIndex >= endIndex) {
        console.log('Alle 12 NFTs bereits geminted!');
        return;
    }

    const confirm = await ui.input(`Mint NFTs #${startIndex} bis #${endIndex - 1} an Owner? (y/n):`);
    if (confirm.toLowerCase() !== 'y') {
        console.log('Abgebrochen.');
        return;
    }

    for (let i = startIndex; i < endIndex; i++) {
        console.log(`Minting NFT #${i}...`);
        await collection.send(provider.sender(), { value: toNano('0.25') }, {
            $$type: 'MintNft',
            query_id: BigInt(i),
            item_index: BigInt(i),
            item_owner: OWNER_ADDRESS,
            individual_content: beginCell().storeStringTail(BASE_URL).endCell(),
        });

        // Kurze Pause zwischen Transaktionen
        if (i < endIndex - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log(`\n${endIndex - startIndex} NFTs geminted (Total: ${endIndex})`);
    console.log('\nSticker-Zuordnung:');
    console.log('  #0 – #2:  Gratis (Airdrop an engagierte Fans)');
    console.log('  #3 – #11: Kaufbar (1 TON pro Sticker)');
    console.log('  Alle 12:  Privater Videogruss vom Model freischalten');
}
