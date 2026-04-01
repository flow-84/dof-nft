import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const collectionAddr = await ui.input('Collection address:');
    const collection = provider.open(NftCollection.fromAddress(Address.parse(collectionAddr)));

    const recipientAddr = await ui.input('Empfaenger Wallet-Adresse:');
    const recipient = Address.parse(recipientAddr);

    const stickerId = await ui.input('Sticker ID (0-11):');
    const stickerNum = parseInt(stickerId);

    if (stickerNum < 0 || stickerNum > 11) {
        console.log('Ungueltige Sticker ID!');
        return;
    }

    const config = await collection.getGetConfig();
    const supply = await collection.getStickerSupply(BigInt(stickerNum));

    console.log(`\nSticker #${stickerNum + 1}:`);
    console.log(`  Geminted: ${supply}/${config.max_per_sticker}`);
    console.log(`  Typ: ${stickerNum < Number(config.free_sticker_count) ? 'Gratis' : 'Premium'}`);
    console.log(`  Empfaenger: ${recipient.toString()}`);

    const confirm = await ui.input('Airdrop senden? (y/n):');
    if (confirm.toLowerCase() !== 'y') {
        console.log('Abgebrochen.');
        return;
    }

    await collection.send(provider.sender(), { value: toNano('0.15') }, {
        $$type: 'MintNft',
        query_id: BigInt(Date.now()),
        sticker_id: BigInt(stickerNum),
        item_owner: recipient,
    });

    console.log(`\nAirdrop gesendet: Sticker #${stickerNum + 1} → ${recipient.toString()}`);
}
